import { verifyGatewayTokenDetailed } from "@free-ai-gateway/core";
import { resolveModelGroupTargets, routeChatCompletion } from "@free-ai-gateway/core";
import {
  translateAnthropicToOpenAI,
  translateOpenAIResponseToAnthropic,
  type AnthropicRequest,
} from "@free-ai-gateway/core";

import { createAnthropicStreamTransformer } from "@free-ai-gateway/core";
import { logRequest } from "@free-ai-gateway/core";
import { checkClientRateLimit } from "@free-ai-gateway/core";
import { anthropicMessagesSchema, validateRequestBody } from "@free-ai-gateway/core";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Endpoint: `POST /v1/messages`
 *
 * Anthropic Messages API Surface endpoint.
 * Menerima request format Anthropic (seperti dari Claude Code CLI atau Anthropic SDK),
 * mentranslasikannya ke skema OpenAI Chat Completion, melewatkannya ke router gateway,
 * dan mengembalikan response terjemahan dalam format Anthropic.
 */
export async function POST(req: Request) {
  // 1. Parsing request body (Dilakukan lebih awal agar model bisa dicek di auth)
  let anthropicBody: AnthropicRequest;
  try {
    anthropicBody = await req.json();
  } catch {
    return Response.json(
      {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "Body request bukan JSON yang valid.",
        },
      },
      { status: 400 }
    );
  }

  // 2. Otorisasi Token Gateway (Mendukung x-api-key atau Bearer token)
  const authHeader = req.headers.get("x-api-key")
    ? `Bearer ${req.headers.get("x-api-key")}`
    : req.headers.get("authorization");

  const authResult = await verifyGatewayTokenDetailed(authHeader, anthropicBody?.model);
  if (!authResult.valid) {
    return Response.json(
      {
        type: "error",
        error: {
          type: "authentication_error",
          message: authResult.error || "Token gateway tidak valid atau tidak ditemukan.",
        },
      },
      { status: authResult.statusCode }
    );
  }
  const authed = authResult.token;

  // Rate Limiting Client Gateway Token
  const rateLimit = await checkClientRateLimit(authed.id);

  const validation = validateRequestBody(anthropicMessagesSchema, anthropicBody);
  if (!validation.success) {
    return Response.json(
      {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: validation.error,
        },
      },
      { status: 400 }
    );
  }

  // 3. Translasi Anthropic request -> OpenAI ChatCompletionRequest
  const openAiReqBody = translateAnthropicToOpenAI(anthropicBody);

  let targets;
  try {
    targets = await resolveModelGroupTargets(anthropicBody.model, anthropicBody.messages);
  } catch {
    targets = await resolveModelGroupTargets("auto", anthropicBody.messages);
  }

  const start = Date.now();
  // 4. Rute request melalui Key Pool & Fallback Engine
  const { response: upstreamRes, usedTarget } = await routeChatCompletion(targets, openAiReqBody);
  const latencyMs = Date.now() - start;

  const keyId = upstreamRes.headers.get("x-gateway-key-id") ?? undefined;
  const actualTarget = usedTarget ?? targets[0];
  logRequest({
    gatewayTokenId: authed.id,
    modelRequested: anthropicBody.model,
    modelUsed: actualTarget ? `${actualTarget.providerId}/${actualTarget.modelId}` : anthropicBody.model,
    keyId,
    latencyMs,
    statusCode: upstreamRes.status,
    storeBody: authed.storeBody,
    prompt: anthropicBody.messages,
  });

  if (!upstreamRes.ok) {
    const errorJson = await upstreamRes.json().catch(() => ({}));
    return Response.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message: errorJson.error?.message || `Upstream error status ${upstreamRes.status}`,
        },
      },
      { status: upstreamRes.status }
    );
  }

  // 5. Tangani Streaming (SSE) vs Non-Streaming Response
  const isStreaming = !!anthropicBody.stream;

  if (!isStreaming) {
    try {
      const openAiResJson = await upstreamRes.json();
      const anthropicResJson = translateOpenAIResponseToAnthropic(openAiResJson, anthropicBody.model);
      return Response.json(anthropicResJson, { status: 200 });
    } catch (err) {
      return Response.json(
        {
          type: "error",
          error: {
            type: "api_error",
            message: "Gagal mentranslasi response upstream ke format Anthropic.",
          },
        },
        { status: 500 }
      );
    }
  } else {
    // Anthropic Streaming SSE Events
    const transformStream = createAnthropicStreamTransformer(anthropicBody.model);
    const mappedStream = upstreamRes.body?.pipeThrough(transformStream);

    return new Response(mappedStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }
}
