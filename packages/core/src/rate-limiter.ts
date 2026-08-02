import { kv, isKvStoreConfigured } from "./kv/client";
import { getEnvVarAsNumber } from "./config/env";

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-memory fallback jika KV store sedang offline/tanpa env var
const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

/** Hapus key yang sudah kadaluarsa secara periodik dari memory map */
export function pruneInMemoryStore(): number {
  const now = Date.now();
  let prunedCount = 0;
  for (const [key, data] of inMemoryStore.entries()) {
    if (now > data.expiresAt) {
      inMemoryStore.delete(key);
      prunedCount++;
    }
  }
  return prunedCount;
}

// Jalankan pruning otomatis setiap 5 menit jika di lingkungan Node.js/long-running
if (typeof setInterval !== "undefined") {
  const timer = setInterval(pruneInMemoryStore, 5 * 60 * 1000);
  if (timer && typeof timer === "object" && "unref" in timer) {
    (timer as any).unref();
  }
}

/**
 * Rate Limiting per Gateway Token Client (Fixed-window 1 menit)
 */
export async function checkClientRateLimit(
  tokenId: string,
  limitPerMinute = getEnvVarAsNumber("CLIENT_RATE_LIMIT_RPM", 60)
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:client:${tokenId}:${Math.floor(now / 60)}`;
  const resetSeconds = 60 - (now % 60);

  // Jika URL KV belum terkonfigurasi, langsung gunakan in-memory fallback dengan aman
  if (!isKvStoreConfigured()) {
    const memoryData = inMemoryStore.get(windowKey);
    if (!memoryData || Date.now() > memoryData.expiresAt) {
      inMemoryStore.set(windowKey, { count: 1, expiresAt: Date.now() + 65000 });
      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: limitPerMinute - 1,
        resetSeconds,
      };
    }

    memoryData.count += 1;
    const remaining = Math.max(0, limitPerMinute - memoryData.count);
    return {
      allowed: memoryData.count <= limitPerMinute,
      limit: limitPerMinute,
      remaining,
      resetSeconds,
    };
  }

  try {
    const current = await kv.incr(windowKey);
    if (current === 1) {
      await kv.expire(windowKey, 65);
    }
    const remaining = Math.max(0, limitPerMinute - current);
    return {
      allowed: current <= limitPerMinute,
      limit: limitPerMinute,
      remaining,
      resetSeconds,
    };
  } catch {
    // In-memory fallback
    const memoryData = inMemoryStore.get(windowKey);
    if (!memoryData || Date.now() > memoryData.expiresAt) {
      inMemoryStore.set(windowKey, { count: 1, expiresAt: Date.now() + 65000 });
      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: limitPerMinute - 1,
        resetSeconds,
      };
    }

    memoryData.count += 1;
    const remaining = Math.max(0, limitPerMinute - memoryData.count);
    return {
      allowed: memoryData.count <= limitPerMinute,
      limit: limitPerMinute,
      remaining,
      resetSeconds,
    };
  }
}

/**
 * Rate Limiting per IP Address (Fixed-window 1 menit)
 * Terutama digunakan untuk endpoint publik (tanpa auth gateway token) seperti /api/chat dan /api/tags
 */
export async function checkIpRateLimit(
  ip: string,
  limitPerMinute = getEnvVarAsNumber("IP_RATE_LIMIT_RPM", 20)
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:ip:${ip}:${Math.floor(now / 60)}`;
  const resetSeconds = 60 - (now % 60);

  if (!isKvStoreConfigured()) {
    const memoryData = inMemoryStore.get(windowKey);
    if (!memoryData || Date.now() > memoryData.expiresAt) {
      inMemoryStore.set(windowKey, { count: 1, expiresAt: Date.now() + 65000 });
      return { allowed: true, limit: limitPerMinute, remaining: limitPerMinute - 1, resetSeconds };
    }
    memoryData.count += 1;
    return {
      allowed: memoryData.count <= limitPerMinute,
      limit: limitPerMinute,
      remaining: Math.max(0, limitPerMinute - memoryData.count),
      resetSeconds,
    };
  }

  try {
    const current = await kv.incr(windowKey);
    if (current === 1) await kv.expire(windowKey, 65);
    return {
      allowed: current <= limitPerMinute,
      limit: limitPerMinute,
      remaining: Math.max(0, limitPerMinute - current),
      resetSeconds,
    };
  } catch {
    const memoryData = inMemoryStore.get(windowKey);
    if (!memoryData || Date.now() > memoryData.expiresAt) {
      inMemoryStore.set(windowKey, { count: 1, expiresAt: Date.now() + 65000 });
      return { allowed: true, limit: limitPerMinute, remaining: limitPerMinute - 1, resetSeconds };
    }
    memoryData.count += 1;
    return {
      allowed: memoryData.count <= limitPerMinute,
      limit: limitPerMinute,
      remaining: Math.max(0, limitPerMinute - memoryData.count),
      resetSeconds,
    };
  }
}
