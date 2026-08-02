import { verifyGatewayTokenDetailed } from "../auth";
import { resolveModelGroupTargets, routeChatCompletion } from "../router";
import { emitRequestCompleted } from "../events/client";
import { checkClientRateLimit } from "../rate-limiter";
import { chatCompletionSchema, validateRequestBody } from "../validation/schemas";
import { withTrace } from "../observability/tracer";
import type { ChatCompletionRequest } from "../providers/types";

export interface GatewayRequestPayload {
  token: string | null;
  body: unknown;
}

export interface GatewayResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: any; // Bisa berupa string, JSON, atau ReadableStream
  stream?: boolean; // Indikator jika body adalah stream
}

/**
 * Core Headless Engine untuk memproses request AI Gateway.
 * Fungsi ini murni TypeScript/JavaScript standar dan tidak memiliki dependensi pada Next.js Request/Response.
 */
export async function processChatRequest(payload: GatewayRequestPayload): Promise<GatewayResponse> {
  const start = Date.now();

  // 1. Validasi Body (Canonical Schema)
  const validation = validateRequestBody(chatCompletionSchema, payload.body);
  if (!validation.success) {
    return {
      statusCode: 400,
      body: { error: { message: validation.error, type: "invalid_request" } }
    };
  }
  const parsedBody = validation.data as ChatCompletionRequest;

  // 2. Autentikasi & Model Permission Checking
  const tokenAuth = await verifyGatewayTokenDetailed(payload.token, parsedBody.model);
  if (!tokenAuth.valid) {
    return {
      statusCode: tokenAuth.statusCode || 401,
      body: { error: { message: tokenAuth.error, type: tokenAuth.statusCode === 403 ? "permission_denied" : "unauthorized" } }
    };
  }
  const authed = tokenAuth.token;

  // 3. Rate Limiting Client Gateway Token
  const rateLimit = await checkClientRateLimit(authed.id);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        "Retry-After": String(rateLimit.resetSeconds),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
      body: { error: { message: "Rate limit token terlampaui. Coba beberapa saat lagi.", type: "rate_limit_exceeded" } }
    };
  }

  // 5. Smart Routing Resolution & Upstream Fetch dibungkus dengan OTel Trace
  let targets;
  try {
    targets = await withTrace("router.resolve_targets", { model: parsedBody.model }, async () => {
      return await resolveModelGroupTargets(parsedBody.model, parsedBody.messages);
    });
  } catch (err) {
    return {
      statusCode: 400,
      body: { error: { message: (err as Error).message, type: "invalid_request" } }
    };
  }

  // 6. Upstream Fetch Trace
  const { response: upstreamRes, usedTarget } = await withTrace("provider.fetch", { 
    provider_id: targets[0]?.providerId || "unknown",
    model_id: targets[0]?.modelId || "unknown"
  }, async (span) => {
    const result = await routeChatCompletion(targets, parsedBody);
    if (result.usedTarget) {
      span.setAttribute("used_provider", result.usedTarget.providerId);
      span.setAttribute("used_model", result.usedTarget.modelId);
    }
    span.setAttribute("http.status_code", result.response.status);
    return result;
  });
  
  const latencyMs = Date.now() - start;

  // 7. Event-Driven Side Effects (Logging & Usage Record dipindah ke Background Queue)
  const keyId = upstreamRes.headers.get("x-gateway-key-id") ?? undefined;
  const actualTarget = usedTarget ?? targets[0];
  
  emitRequestCompleted({
    gatewayTokenId: authed.id,
    modelRequested: parsedBody.model,
    modelUsed: actualTarget ? `${actualTarget.providerId}/${actualTarget.modelId}` : parsedBody.model,
    keyId,
    latencyMs,
    statusCode: upstreamRes.status,
    storeBody: authed.storeBody,
    prompt: parsedBody.messages,
  });

  // 8. Construct Response
  const headers: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "x-gateway-key-id") {
      headers[key] = value;
    }
  });

  return {
    statusCode: upstreamRes.status,
    headers,
    body: upstreamRes.body, // Bisa ReadableStream
    stream: true // Karena kita pass upstream body langsung
  };
}
