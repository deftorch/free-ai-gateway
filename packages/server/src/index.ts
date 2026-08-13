import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ProviderAdapter } from "@free-ai-gateway/core";
import { ProviderError, getProviderPool, NoAvailableKeyError } from "@free-ai-gateway/core";
import { geminiAdapter } from "@free-ai-gateway/adapter-gemini";
import { nvidiaNimAdapter } from "@free-ai-gateway/adapter-nvidia-nim";
import { chatCompletionRequestSchema } from "./schemas/chat-completion";

/**
 * Titik masuk HTTP.
 * Step 1: provider kedua (NVIDIA NIM) + kontrak ProviderAdapter terbukti generik.
 * Step 2: Virtual API key auth & provider scope enforcement aktif.
 * Step 3: Multi-key round-robin provider pool.
 *
 * SENGAJA belum ada: provider fallback rotasi (Step 9) --
 * kredensial asli provider dibaca di core dari env var dan di-pool di sana.
 */
import { requireAuth } from "./middleware/auth";
import { initializeAllPools, recordCooldown } from "@free-ai-gateway/core";

// Fail-fast at startup if any provider is missing its credentials
await initializeAllPools();

export type AppEnv = {
  Variables: {
    tenantId: string;
    scopes: string[];
  };
};

const app = new Hono<AppEnv>();

app.get("/healthz", (c) => c.json({ status: "ok" }));

app.use("/v1/*", requireAuth);

/** Registry adapter yang aktif. Tambah provider baru = tambah 1 baris di sini. */
const adapters: Record<string, ProviderAdapter> = {
  gemini: geminiAdapter,
  "nvidia-nim": nvidiaNimAdapter,
};

/** Map ProviderError generik -> status HTTP + body error format OpenAI. */
function providerErrorToResponse(err: ProviderError): { status: number; body: unknown } {
  const statusByKind: Record<ProviderError["kind"], number> = {
    rate_limited: 429,
    auth_failed: 401,
    model_not_found: 404,
    upstream_error: 502,
    network_error: 503,
  };
  return {
    status: statusByKind[err.kind],
    body: { error: { message: err.message, type: err.kind } },
  };
}

app.post("/v1/chat/completions", async (c) => {
  const json = await c.req.json().catch(() => null);
  if (json === null) {
    return c.json({ error: { message: "Body bukan JSON valid", type: "invalid_request" } }, 400);
  }

  const parsed = chatCompletionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return c.json(
      { error: { message: parsed.error.message, type: "invalid_request" } },
      400,
    );
  }
  const body = parsed.data;

  const adapter = adapters[body.provider];
  if (!adapter) {
    // Tidak seharusnya kejadian -- zod enum sudah membatasi -- tapi dijaga
    // eksplisit kalau registry adapter & schema enum sempat tidak sinkron.
    return c.json(
      { error: { message: `Provider tidak dikenal: ${body.provider}`, type: "invalid_request" } },
      400,
    );
  }

  // Authorization: Periksa apakah token memiliki scope untuk provider yang direquest
  const scopes = c.get("scopes") as string[];
  if (!scopes.includes(body.provider)) {
    return c.json(
      { error: { message: `Akses ditolak: Virtual key tidak memiliki izin (scope) untuk provider '${body.provider}'.`, type: "insufficient_scope" } },
      403,
    );
  }

  let apiKey: string;
  try {
    const pool = getProviderPool(body.provider);
    apiKey = pool.selectNextKey();
  } catch (err) {
    if (err instanceof NoAvailableKeyError) {
      return c.json(
        {
          error: {
            message: `Semua key untuk provider '${body.provider}' sedang dalam masa cooldown.`,
            type: "all_keys_exhausted",
            next_available_at: new Date(err.nextAvailableAt).toISOString(),
          },
        },
        429,
      );
    }
    return c.json({ error: { message: (err as Error).message, type: "config_error" } }, 500);
  }

  const coreRequest = {
    model: body.model,
    messages: body.messages,
    ...(body.stream !== undefined ? { stream: body.stream } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.max_tokens !== undefined ? { maxTokens: body.max_tokens } : {}),
  };

  // --- Streaming: proxy chunk demi chunk sebagai SSE format OpenAI ---
  if (body.stream) {
    return streamSSE(c, async (stream) => {
      try {
        for await (const chunk of adapter.chatCompletionStream(apiKey, coreRequest)) {
          await stream.writeSSE({
            data: JSON.stringify({
              id: chunk.id,
              object: "chat.completion.chunk",
              model: chunk.model,
              choices: [
                {
                  index: 0,
                  delta: { content: chunk.deltaText },
                  finish_reason: chunk.finishReason,
                },
              ],
            }),
          });
        }
        await stream.writeSSE({ data: "[DONE]" });
      } catch (err) {
        if (err instanceof ProviderError) {
          if (err.kind === "rate_limited") {
            await recordCooldown(body.provider, apiKey, err.retryAfterMs);
          }
          const { body: errBody } = providerErrorToResponse(err);
          await stream.writeSSE({ data: JSON.stringify(errBody) });
        } else {
          throw err;
        }
      }
    });
  }

  // --- Non-streaming: satu response penuh, format chat.completion OpenAI ---
  try {
    const result = await adapter.chatCompletion(apiKey, coreRequest);
    return c.json({
      id: result.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.text },
          finish_reason: result.finishReason,
        },
      ],
      usage: {
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.promptTokens + result.usage.completionTokens,
      },
    });
  } catch (err) {
    if (err instanceof ProviderError) {
      if (err.kind === "rate_limited") {
        await recordCooldown(body.provider, apiKey, err.retryAfterMs);
      }
      const { status, body: errBody } = providerErrorToResponse(err);
      return c.json(errBody, status as 429 | 401 | 404 | 502 | 503);
    }
    throw err;
  }
});

export default app;
