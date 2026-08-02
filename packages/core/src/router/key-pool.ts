import { eq, and } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { apiKeys } from "@free-ai-gateway/database";
import { kv, kvKeys, isKvStoreConfigured } from "../kv/client";

export type KeyOrderingStrategy = "lru" | "round-robin" | "weighted" | "latency" | "default";

/**
 * Menghitung skor terpadu (Unified Score) key berdasarkan kesehatan, sisa kuota RPD, dan recency.
 */
export async function calculateKeyScore(row: typeof apiKeys.$inferSelect): Promise<number> {
  let score = 100;

  if (!isKvStoreConfigured()) {
    return score;
  }

  // Ketiga pembacaan KV ini independen satu sama lain, jadi dijalankan paralel
  // (Promise.all) alih-alih sequential await, untuk memangkas latency round-trip.
  const quotaMeta = (row.quotaMeta || {}) as { rpdLimit?: number };
  const [streak, rpdUsed, kvLastUsed] = await Promise.all([
    kv.get<number>(kvKeys.errorStreak(row.id)).catch(() => null),
    typeof quotaMeta.rpdLimit === "number" && quotaMeta.rpdLimit > 0
      ? kv.get<number>(kvKeys.rpdCount(row.id)).catch(() => null)
      : Promise.resolve(null),
    kv.get<number>(kvKeys.lastUsed(row.id)).catch(() => null),
  ]);

  // 1. Failure streak penalty (-20 poin per error)
  score -= (streak || 0) * 20;

  // 2. Multi-Window Quota score ratio (+30 bonus poin untuk kuota melimpah)
  if (typeof quotaMeta.rpdLimit === "number" && quotaMeta.rpdLimit > 0) {
    const remainingRatio = Math.max(0, (quotaMeta.rpdLimit - (rpdUsed || 0)) / quotaMeta.rpdLimit);
    score += remainingRatio * 30;
  }

  // 3. LRU Recency bonus (+10 jika idle > 1 menit)
  const lastUsed = kvLastUsed ?? (row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0);
  const idleMs = Date.now() - lastUsed;
  if (idleMs > 60000) score += 10;

  return score;
}

/**
 * Strategi pemilihan key kandidat (Fase 2 - 4).
 * Membantu mendistribusikan beban request ke beberapa key yang tersedia
 * untuk provider yang sama (multi-key pooling).
 */
export async function getActiveCandidateKeys(
  providerId: string,
  strategy: KeyOrderingStrategy = "lru"
) {
  // Chaos Engineering: Outage Simulator Check
  const isChaosOutage = await kv.get<boolean>(kvKeys.chaosOutage(providerId)).catch(() => false);
  if (isChaosOutage) {
    console.warn(`[chaos] Simulated outage active for provider '${providerId}'. Returning 0 candidates to trigger failover.`);
    return [];
  }

  let rows: Array<typeof apiKeys.$inferSelect> = [];
  try {
    rows = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.providerId, providerId), eq(apiKeys.status, "active")));
  } catch {
    rows = [];
  }

  if (rows.length === 0) return [];

  // Filter key yang sedang dalam cooldown atau kehabisan kuota harian (RPD).
  // Pembacaan KV per-key independen antar key, jadi dijalankan paralel
  // (Promise.all) alih-alih satu-per-satu, agar tidak jadi N round-trip
  // Redis berurutan saat provider punya banyak key.
  const checked = await Promise.all(
    rows.map(async (row) => {
      const cooldown = await kv.get<number>(kvKeys.cooldown(row.id)).catch(() => null);
      if (cooldown && cooldown > Date.now()) return null;

      // Proactive Multi-Window Daily Quota Check (RPD Limit)
      const quotaMeta = (row.quotaMeta || {}) as { rpdLimit?: number; tpdLimit?: number };
      if (typeof quotaMeta.rpdLimit === "number" && quotaMeta.rpdLimit > 0) {
        const rpdUsed = await kv.get<number>(kvKeys.rpdCount(row.id)).catch(() => null);
        if (rpdUsed && rpdUsed >= quotaMeta.rpdLimit) {
          return null; // Skip key yang sudah kehabisan kuota harian (RPD)
        } else if (rpdUsed && rpdUsed >= quotaMeta.rpdLimit * 0.9) {
          const { triggerQuotaWarningAlert } = await import("../notifications/alerting");
          triggerQuotaWarningAlert({
            keyId: row.id,
            providerId: row.providerId,
            rpdUsed,
            rpdLimit: quotaMeta.rpdLimit,
          }).catch((e) => { console.error('[SilentError]', e); });
        }
      }

      return row;
    })
  );
  const available: typeof rows = checked.filter((row): row is typeof rows[number] => row !== null);

  if (available.length <= 1) return available;

  if (strategy === "weighted" || strategy === "latency") {
    const scoredKeys = await Promise.all(
      available.map(async (row) => ({
        row,
        score: await calculateKeyScore(row),
      }))
    );
    scoredKeys.sort((a, b) => b.score - a.score); // Skor tertinggi pertama
    return scoredKeys.map((k) => k.row);
  }

  if (strategy === "round-robin") {
    try {
      const counter = await kv.incr(kvKeys.rrIndex(providerId)).catch(() => null);
      if (typeof counter === "number" && counter > 0) {
        const offset = (counter - 1) % available.length;
        return [...available.slice(offset), ...available.slice(0, offset)];
      }
    } catch {
      // Fallback jika Redis error
    }
    return available;
  }

  if (strategy === "lru") {
    const keyLastUsed = await Promise.all(
      available.map(async (row) => {
        const kvLastUsed = await kv.get<number>(kvKeys.lastUsed(row.id)).catch(() => null);
        const lastUsed =
          kvLastUsed ?? (row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0);
        return { row, lastUsed };
      })
    );

    // Urutkan dari yang paling lama tidak digunakan (smallest lastUsed timestamp first)
    keyLastUsed.sort((a, b) => a.lastUsed - b.lastUsed);
    return keyLastUsed.map((item) => item.row);
  }

  return available;
}

export interface ProviderCapacityMetric {
  providerId: string;
  totalKeys: number;
  activeKeys: number;
  readyKeys: number;
  cooldownKeys: number;
  exhaustedKeys: number;
  disabledKeys: number;
  totalRpdLimit: number;
  totalRpdUsed: number;
  totalRpdRemaining: number;
  rpdUsagePercent: number;
  healthStatus: "healthy" | "degraded" | "critical";
  isChaosOutage?: boolean;
}

/**
 * Mengkalkulasi agregasi kapasitas RPD dan indikator kesehatan per provider.
 */
export async function getProviderCapacityMetrics(): Promise<ProviderCapacityMetric[]> {
  let allKeys: Array<typeof apiKeys.$inferSelect> = [];
  try {
    allKeys = await db.select().from(apiKeys);
  } catch {
    allKeys = [];
  }

  if (allKeys.length === 0) return [];

  const providerGroups = new Map<string, Array<typeof apiKeys.$inferSelect>>();
  for (const key of allKeys) {
    const list = providerGroups.get(key.providerId) || [];
    list.push(key);
    providerGroups.set(key.providerId, list);
  }

  const metrics: ProviderCapacityMetric[] = [];

  for (const [providerId, keys] of providerGroups.entries()) {
    const isChaosOutage = await kv.get<boolean>(kvKeys.chaosOutage(providerId)).catch(() => false);
    let totalKeys = keys.length;
    let activeKeys = 0;
    let readyKeys = 0;
    let cooldownKeys = 0;
    let exhaustedKeys = 0;
    let disabledKeys = 0;
    let totalRpdLimit = 0;
    let totalRpdUsed = 0;

    // Pembacaan KV (rpdUsed + cooldown) untuk semua key non-disabled di provider ini
    // dijalankan paralel, bukan satu-per-satu, agar latency tidak bertumbuh linear
    // dengan jumlah key per provider.
    const activeKeysList = keys.filter((k) => k.status !== "disabled");
    disabledKeys += keys.length - activeKeysList.length;
    activeKeys += activeKeysList.length;

    const keyMetrics = await Promise.all(
      activeKeysList.map(async (key) => {
        const quotaMeta = (key.quotaMeta || {}) as { rpdLimit?: number };
        const limit = typeof quotaMeta.rpdLimit === "number" && quotaMeta.rpdLimit > 0 ? quotaMeta.rpdLimit : 0;
        const [rpdUsed, cooldown] = await Promise.all([
          kv.get<number>(kvKeys.rpdCount(key.id)).catch(() => null),
          kv.get<number>(kvKeys.cooldown(key.id)).catch(() => null),
        ]);
        return { limit, rpdUsed: rpdUsed || 0, isCooldown: Boolean(cooldown && cooldown > Date.now()) };
      })
    );

    for (const { limit, rpdUsed, isCooldown } of keyMetrics) {
      totalRpdLimit += limit;
      totalRpdUsed += rpdUsed;

      if (isCooldown) {
        cooldownKeys++;
      } else if (limit > 0 && rpdUsed >= limit) {
        exhaustedKeys++;
      } else {
        readyKeys++;
      }
    }

    const totalRpdRemaining = Math.max(0, totalRpdLimit - totalRpdUsed);
    const rpdUsagePercent = totalRpdLimit > 0 ? Number(((totalRpdUsed / totalRpdLimit) * 100).toFixed(1)) : 0;

    let healthStatus: "healthy" | "degraded" | "critical" = "healthy";
    if (isChaosOutage || readyKeys === 0 || rpdUsagePercent >= 98) {
      healthStatus = "critical";
    } else if (cooldownKeys > 0 || exhaustedKeys > 0 || rpdUsagePercent >= 75) {
      healthStatus = "degraded";
    }

    metrics.push({
      providerId,
      totalKeys,
      activeKeys,
      readyKeys: isChaosOutage ? 0 : readyKeys,
      cooldownKeys,
      exhaustedKeys,
      disabledKeys,
      totalRpdLimit,
      totalRpdUsed,
      totalRpdRemaining,
      rpdUsagePercent,
      healthStatus,
      isChaosOutage: Boolean(isChaosOutage),
    });
  }

  return metrics;
}

