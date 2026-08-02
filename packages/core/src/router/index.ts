import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { apiKeys } from "@free-ai-gateway/database";
import { decryptApiKey } from "../crypto";
import { kv, kvKeys } from "../kv/client";
import { getProviderAdapter, ProviderHttpError } from "../providers";
import type { ChatCompletionRequest } from "../providers/types";
import { sanitizeLoneSurrogates, simulateSystemRole } from "../providers/quirks";
import { analyzePromptSafety } from "../validation/safety";

import { getActiveCandidateKeys, getProviderCapacityMetrics, type KeyOrderingStrategy } from "./key-pool";
import { resolveModelGroupTargets, classifyTask, type TaskType } from "./smart-router";

export { getActiveCandidateKeys, getProviderCapacityMetrics, resolveModelGroupTargets, classifyTask, type KeyOrderingStrategy, type TaskType };

const CIRCUIT_BREAKER_THRESHOLD = 5; // 5x gagal beruntun -> cooldown lebih lama (5.2)
const CIRCUIT_BREAKER_COOLDOWN_S = 15 * 60;
const DEFAULT_COOLDOWN_S = 30; // fallback kalau provider tidak kirim Retry-After

export interface RouteTarget {
  providerId: string;
  modelId: string; // model id sesuai skema provider asli (tanpa prefix)
}

/**
 * Model id yang diterima client di gateway berformat "provider/model",
 * mis. "groq/openai/gpt-oss-120b" — mengikuti konvensi OpenRouter yang
 * sudah dikenal luas, supaya /v1/models gampang menggabungkan lintas provider
 * (lihat bagian 3.1 & 9 dokumen desain).
 */
export function parseModelId(raw: string): RouteTarget {
  const idx = raw.indexOf("/");
  if (idx === -1) {
    throw new Error(`Format model id tidak valid: "${raw}". Gunakan "provider/model".`);
  }
  return { providerId: raw.slice(0, idx), modelId: raw.slice(idx + 1) };
}

import { getSecondsUntilUTCMidnight } from "../kv/client";
import { models } from "@free-ai-gateway/database";

const MAX_EXPONENTIAL_COOLDOWN_S = 120 * 60; // Max cap 2 jam untuk outage panjang

export async function retireModel(modelFullId: string) {
  try {
    await db
      .update(models)
      .set({ status: "deprecated", needsReview: true })
      .where(eq(models.id, modelFullId));
  } catch (err) {
    console.error(`[tombstone] Gagal memensiunkan model ${modelFullId}:`, err);
  }
}

export async function markCooldown(apiKeyId: string, seconds: number) {
  await kv.set(kvKeys.cooldown(apiKeyId), Date.now() + seconds * 1000, { ex: seconds });
}

import { triggerCircuitBreakerAlert, triggerKeyDisabledAlert } from "../notifications/alerting";

export async function recordFailure(apiKeyId: string, providerId: string = "unknown") {
  const streak = await kv.incr(kvKeys.errorStreak(apiKeyId));
  await kv.expire(kvKeys.errorStreak(apiKeyId), 120); // window 2 menit

  if (streak >= CIRCUIT_BREAKER_THRESHOLD) {
    const level = (await kv.incr(kvKeys.backoffLevel(apiKeyId))) || 1;
    // Exponential Backoff: 15m * (2^(level-1)) -> 15m, 30m, 60m, 120m max cap
    const cooldownSeconds = Math.min(
      CIRCUIT_BREAKER_COOLDOWN_S * Math.pow(2, Math.max(0, level - 1)),
      MAX_EXPONENTIAL_COOLDOWN_S
    );
    await markCooldown(apiKeyId, cooldownSeconds);
    await kv.del(kvKeys.errorStreak(apiKeyId));

    triggerCircuitBreakerAlert({
      keyId: apiKeyId,
      providerId,
      failureStreak: streak,
      cooldownSeconds,
    }).catch((e) => { console.error('[SilentError]', e); });
  }
}

export async function recordSuccess(apiKeyId: string) {
  await kv.del(kvKeys.errorStreak(apiKeyId));
  await kv.del(kvKeys.backoffLevel(apiKeyId)); // Reset backoff level saat sukses
  await kv.set(kvKeys.lastUsed(apiKeyId), Date.now());

  // Track Multi-Window RPD di Redis dengan TTL reset 00:00 UTC
  const rpdKey = kvKeys.rpdCount(apiKeyId);
  await kv.incr(rpdKey).catch((e) => { console.error('[SilentError]', e); });
  await kv.expire(rpdKey, getSecondsUntilUTCMidnight()).catch((e) => { console.error('[SilentError]', e); });

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKeyId)).catch((e) => { console.error('[SilentError]', e); });
}

export async function disableKey(apiKeyId: string, providerId: string = "unknown") {
  await db.update(apiKeys).set({ status: "disabled" }).where(eq(apiKeys.id, apiKeyId));
  triggerKeyDisabledAlert({
    keyId: apiKeyId,
    providerId,
    reason: "401/403 Invalid API key atau Auth failure",
  }).catch((e) => { console.error('[SilentError]', e); });
}

/**
 * Rute request ke 1 provider target spesifik.
 */
async function routeSingleTarget(
  target: RouteTarget,
  body: ChatCompletionRequest,
  strategy: KeyOrderingStrategy = "lru"
): Promise<Response> {
  const adapter = getProviderAdapter(target.providerId);
  const candidates = await getActiveCandidateKeys(target.providerId, strategy);

  if (candidates.length === 0) {
    return Response.json(
      {
        error: {
          message: `Tidak ada key aktif yang tersedia untuk provider "${target.providerId}" saat ini.`,
          type: "no_available_key",
        },
      },
      { status: 503 }
    );
  }

  // --- Terapkan Provider Quirks & Safety Sebelum Loop Kirim Request ---
  let processedBody = { ...body };

  // 1. Sanitisasi Lone Surrogates pada semua pesan
  processedBody.messages = processedBody.messages.map((msg) => ({
    ...msg,
    content: typeof msg.content === "string" ? sanitizeLoneSurrogates(msg.content) : msg.content,
  }));

  // 1.b Filter Keamanan Agentic (Langkah 4.3)
  const safetyResult = analyzePromptSafety(processedBody.messages);
  if (!safetyResult.isSafe) {
    return Response.json(
      { error: { message: safetyResult.violationReason, type: "safety_violation" } },
      { status: 403 }
    );
  }

  // 2. Simulasi Role "system" jika provider tidak mendukungnya (misal Google AI Studio)
  if (target.providerId === "google-ai-studio") {
    processedBody.messages = simulateSystemRole(processedBody.messages);
  }
  // -----------------------------------------------------

  let lastError: unknown = null;

  for (const keyRow of candidates) {
    try {
      const plainKey = await decryptApiKey(keyRow.keyEncrypted);

      const providerReq = adapter.buildRequest(plainKey, { ...processedBody, model: target.modelId });
      const res = await fetch(providerReq);

      const classification = adapter.classifyError?.(res) ?? "ok";

      if (res.status === 429 || classification === "rate_limited") {
        const retryAfterHeader = res.headers.get("retry-after");
        const seconds = retryAfterHeader ? Number(retryAfterHeader) : DEFAULT_COOLDOWN_S;
        await markCooldown(keyRow.id, Number.isFinite(seconds) ? seconds : DEFAULT_COOLDOWN_S);
        await recordFailure(keyRow.id);
        lastError = new ProviderHttpError(429, target.providerId);
        continue; // coba key berikutnya (5.1 poin 6)
      }

      if (res.status === 410 || classification === "decommissioned") {
        await retireModel(`${target.providerId}/${target.modelId}`);
        lastError = new ProviderHttpError(
          res.status,
          target.providerId,
          undefined,
          `Model ${target.modelId} sudah EOL/Deprecated/Decommissioned.`
        );
        continue;
      }

      if (res.status === 401 || res.status === 403 || classification === "auth_error") {
        await disableKey(keyRow.id);
        lastError = new ProviderHttpError(res.status, target.providerId);
        continue;
      }

      if (res.status >= 500 || classification === "server_error") {
        await recordFailure(keyRow.id);
        lastError = new ProviderHttpError(res.status, target.providerId);
        continue;
      }

      // Sukses — teruskan response (termasuk stream SSE) apa adanya.
      await recordSuccess(keyRow.id);
      const resHeaders = new Headers(res.headers);
      resHeaders.set("x-gateway-key-id", keyRow.id);

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      await recordFailure(keyRow.id);
      lastError = err;
      continue;
    }
  }

  console.error(`[router] semua kandidat key untuk provider ${target.providerId} gagal:`, lastError);
  return Response.json(
    {
      error: {
        message: `Semua key kandidat untuk ${target.providerId} gagal.`,
        type: "target_candidates_failed",
      },
    },
    { status: 502 }
  );
}

/**
 * Alur inti: bagian 5.1 & 5.4 dokumen desain.
 * Mengakomodasi 1 RouteTarget maupun array RouteTarget (Model Groups / Smart Routing).
 */
export async function routeChatCompletion(
  targetOrTargets: RouteTarget | RouteTarget[],
  body: ChatCompletionRequest,
  strategy: KeyOrderingStrategy = "lru"
): Promise<{ response: Response; usedTarget: RouteTarget | null }> {
  const targets = Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets];
  let lastRes: Response | null = null;

  for (const target of targets) {
    const res = await routeSingleTarget(target, body, strategy);
    if (res.ok) {
      return { response: res, usedTarget: target };
    }
    lastRes = res;
  }

  const fallbackRes =
    lastRes ??
    Response.json(
      {
        error: {
          message: "Semua kandidat model/provider dalam grup ini gagal. Coba lagi nanti.",
          type: "all_candidates_failed",
        },
      },
      { status: 502 }
    );

  return { response: fallbackRes, usedTarget: null };
}

