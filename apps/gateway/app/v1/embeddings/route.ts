import { verifyGatewayTokenDetailed } from "@free-ai-gateway/core";
import { resolveModelGroupTargets, parseModelId } from "@free-ai-gateway/core";
import { getProviderAdapter } from "@free-ai-gateway/core";
import { decryptApiKey } from "@free-ai-gateway/core";
import { getActiveCandidateKeys, markCooldown, recordFailure, recordSuccess, disableKey } from "@free-ai-gateway/core";
import { analyzePromptSafety } from "@free-ai-gateway/core";
import { logRequest } from "@free-ai-gateway/core";
import { checkClientRateLimit } from "@free-ai-gateway/core";
import { embeddingsSchema, validateRequestBody } from "@free-ai-gateway/core";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const start = Date.now();

  let body: { model?: string; input?: string | string[]; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { message: "Body request bukan JSON yang valid.", type: "invalid_request" } },
      { status: 400 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const authResult = await verifyGatewayTokenDetailed(authHeader, body?.model);
  if (!authResult.valid) {
    return Response.json(
      { error: { message: authResult.error || "Token gateway tidak valid atau tidak ada.", type: "unauthorized" } },
      { status: authResult.statusCode }
    );
  }
  const authed = authResult.token;

  // Rate Limiting Client Gateway Token
  const rateLimit = await checkClientRateLimit(authed.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: { message: "Rate limit token terlampaui. Coba beberapa saat lagi.", type: "rate_limit_exceeded" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  const validation = validateRequestBody(embeddingsSchema, body);
  if (!validation.success) {
    return Response.json(
      { error: { message: validation.error, type: "invalid_request" } },
      { status: 400 }
    );
  }

  const validBody = validation.data;

  let target;
  try {
    target = parseModelId(validBody.model);
  } catch {
    target = { providerId: "groq", modelId: validBody.model };
  }

  const adapter = getProviderAdapter(target.providerId);
  const candidates = await getActiveCandidateKeys(target.providerId, "lru");

  if (candidates.length === 0) {
    return Response.json(
      { error: { message: `Tidak ada key aktif yang tersedia untuk provider "${target.providerId}".`, type: "no_available_key" } },
      { status: 503 }
    );
  }

  let lastError: unknown = null;

  for (const keyRow of candidates) {
    try {
      const plainKey = await decryptApiKey(keyRow.keyEncrypted);
      const url = `${adapter.baseUrl}/embeddings`;

      // Prompt Safety Check
      const inputs = Array.isArray(validBody.input) ? validBody.input : [validBody.input];
      const safetyCheckMessages = inputs.map(text => ({ role: "user", content: text }));
      const safetyResult = analyzePromptSafety(safetyCheckMessages);
      if (!safetyResult.isSafe) {
        return Response.json(
          { error: { message: safetyResult.violationReason, type: "safety_violation" } },
          { status: 403 }
        );
      }

      const upstreamRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plainKey}`,
        },
        body: JSON.stringify({
          model: target.modelId,
          input: body.input,
        }),
      });

      const latencyMs = Date.now() - start;
      const classification = adapter.classifyError?.(upstreamRes) ?? "ok";

      if (upstreamRes.status === 429 || classification === "rate_limited") {
        const retryAfterHeader = upstreamRes.headers.get("retry-after");
        const seconds = retryAfterHeader ? Number(retryAfterHeader) : 30;
        await markCooldown(keyRow.id, Number.isFinite(seconds) ? seconds : 30);
        await recordFailure(keyRow.id, target.providerId);
        lastError = new Error(`Rate limited by ${target.providerId}`);
        continue;
      }

      if (upstreamRes.status === 401 || upstreamRes.status === 403 || classification === "auth_error") {
        await disableKey(keyRow.id, target.providerId);
        lastError = new Error(`Auth error from ${target.providerId}`);
        continue;
      }

      if (upstreamRes.status >= 500 || classification === "server_error") {
        await recordFailure(keyRow.id, target.providerId);
        lastError = new Error(`Server error from ${target.providerId}`);
        continue;
      }

      await recordSuccess(keyRow.id);

      logRequest({
        gatewayTokenId: authed.id,
        modelRequested: validBody.model,
        modelUsed: `${target.providerId}/${target.modelId}`,
        keyId: keyRow.id,
        latencyMs,
        statusCode: upstreamRes.status,
        storeBody: authed.storeBody,
        prompt: safetyCheckMessages,
      });

      const clientHeaders = new Headers(upstreamRes.headers);
      clientHeaders.delete("x-gateway-key-id");
      clientHeaders.set("x-gateway-key-id", keyRow.id);

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: clientHeaders,
      });
    } catch (err) {
      await recordFailure(keyRow.id, target.providerId);
      lastError = err;
      continue;
    }
  }

  return Response.json(
    { error: { message: "Gagal memproses request embedding pada provider target.", type: "embedding_failed" } },
    { status: 502 }
  );
}
