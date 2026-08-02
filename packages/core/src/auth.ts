import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { gatewayTokens } from "@free-ai-gateway/database";
import { hashGatewayToken } from "./crypto";

/**
 * Validasi token gateway per-proyek (bagian 8.1). Dipakai di /v1/* —
 * endpoint publik gateway TIDAK boleh diakses tanpa token ini (8.2: bukan
 * open endpoint).
 */
import { kv, kvKeys, getTodayUTCDateString, getSecondsUntilUTCMidnight } from "./kv/client";
import { getEnvVar } from "./config/env";

export type GatewayTokenValidationResult =
  | { valid: true; token: typeof gatewayTokens.$inferSelect }
  | { valid: false; error: string; statusCode: 401 | 403 | 429 };

/**
 * Validasi token gateway per-proyek dengan pemeriksaan Scope Model & Budget Cap Harian.
 */
export async function verifyGatewayTokenDetailed(
  authHeader: string | null,
  requestedModel?: string
): Promise<GatewayTokenValidationResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header", statusCode: 401 };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { valid: false, error: "Empty Bearer token", statusCode: 401 };
  }

  const hash = await hashGatewayToken(token);
  let row: typeof gatewayTokens.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(gatewayTokens)
      .where(eq(gatewayTokens.tokenHash, hash))
      .limit(1);
    row = rows[0];
  } catch {
    row = undefined;
  }

  if (!row || row.status !== "active") {
    return { valid: false, error: "Invalid or revoked gateway token", statusCode: 401 };
  }

  // 1. Validasi Scope Model Permission (allowedModels)
  if (requestedModel && row.allowedModels && Array.isArray(row.allowedModels) && row.allowedModels.length > 0) {
    const allowedPatterns = row.allowedModels;
    const isAllowed = allowedPatterns.some((pattern) => {
      if (pattern === "*" || pattern === "all") return true;
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return requestedModel.startsWith(`${prefix}/`);
      }
      return pattern === requestedModel;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Gateway token is not authorized to access model '${requestedModel}'`,
        statusCode: 403,
      };
    }
  }

  // 2. Validasi Budget Cap Harian (maxDailyRequests)
  if (typeof row.maxDailyRequests === "number" && row.maxDailyRequests > 0) {
    const today = getTodayUTCDateString();
    const redisKey = kvKeys.tokenRpdCount(row.id, today);
    const usedToday = (await kv.get<number>(redisKey).catch(() => null)) || 0;

    if (usedToday >= row.maxDailyRequests) {
      return {
        valid: false,
        error: `Gateway token daily request limit (${row.maxDailyRequests} req/day) exceeded. Resets at 00:00 UTC.`,
        statusCode: 429,
      };
    }
  }

  return { valid: true, token: row };
}

/**
 * Mencatat penggunaan request harian token di Redis (TTL 00:00 UTC).
 */
export async function recordTokenUsage(tokenId: string): Promise<number> {
  const today = getTodayUTCDateString();
  const redisKey = kvKeys.tokenRpdCount(tokenId, today);
  const count = (await kv.incr(redisKey).catch(() => null)) || 1;

  if (count === 1) {
    const ttl = getSecondsUntilUTCMidnight();
    await kv.expire(redisKey, ttl).catch((e) => { console.error('[SilentError]', e); });
  }

  return count;
}

/**
 * Legacy compatibility wrapper untuk verifyGatewayToken.
 */
export async function verifyGatewayToken(
  authHeader: string | null
): Promise<{ id: string; storeBody: boolean } | null> {
  const result = await verifyGatewayTokenDetailed(authHeader);
  if (!result.valid) return null;
  return { id: result.token.id, storeBody: result.token.storeBody };
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; ++i) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validasi token admin internal (§ /internal/keys, /internal/health).
 * Sengaja terpisah total dari token gateway biasa (lihat checklist §8).
 */
export function verifyInternalAdminToken(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  const expected = getEnvVar("INTERNAL_ADMIN_TOKEN");
  if (expected && safeCompare(token, expected)) return true;

  // Jalur test HANYA aktif jika kedua kondisi dipenuhi:
  //   1. NODE_ENV bukan "production" (mencegah aktif tak sengaja di prod)
  //   2. TEST_ADMIN_TOKEN benar-benar di-set di environment (CI/lokal)
  // Tidak ada kredensial literal yang ditulis di source code. CI harus
  // men-generate/menyuntikkan nilai TEST_ADMIN_TOKEN-nya sendiri (mis. secret
  // acak) alih-alih menaruh password tetap yang bisa dibaca siapa pun di repo.
  const testToken = getEnvVar("TEST_ADMIN_TOKEN");
  if (getEnvVar("NODE_ENV") !== "production" && testToken && safeCompare(token, testToken)) {
    return true;
  }
  return false;
}

/** Validasi CRON_SECRET untuk endpoint cron (native maupun trigger eksternal). */
export function verifyCronSecret(authHeader: string | null): boolean {
  const expected = getEnvVar("CRON_SECRET");
  if (!expected) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  return safeCompare(authHeader.slice("Bearer ".length).trim(), expected);
}

