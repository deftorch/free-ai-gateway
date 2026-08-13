import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ProviderAdapter } from "@free-ai-gateway/core";
import { ProviderError } from "@free-ai-gateway/core";
import { geminiAdapter } from "@free-ai-gateway/adapter-gemini";
import { nvidiaNimAdapter } from "@free-ai-gateway/adapter-nvidia-nim";
import { chatCompletionRequestSchema } from "./schemas/chat-completion";

/**
 * Titik masuk HTTP. Step 1 walking skeleton (§12.1): provider kedua (NVIDIA
 * NIM) + kontrak ProviderAdapter dipakai lintas 2 provider yang formatnya
 * beda jauh (Gemini custom, NVIDIA NIM OpenAI-compatible) -- membuktikan
 * kontrak generic, bukan diam-diam Gemini-spesifik.
 *
 * SENGAJA belum ada: multi-key (Step 3), auto-resolve provider dari nama
 * model / fallback (Step 9), virtual key/tenant lookup (Step 2) -- key
 * diambil langsung dari env var, bukan dari database. Jangan tambahkan itu
 * di sini, itu scope step berikutnya -- lihat docs/walking-skeleton-checklist.md.
 */
import { requireAuth } from "./middleware/auth";

const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));

app.use("/v1/*", requireAuth);

/** Registry adapter yang aktif. Tambah provider baru = tambah 1 baris di sini. */
const adapters: Record<string, ProviderAdapter> = {
  gemini: geminiAdapter,
  "nvidia-nim": nvidiaNimAdapter,
};

/** Nama env var per provider. Step 1 = 1 key per provider, tidak ada rotasi (Step 3). */
const envVarByProvider: Record<string, string> = {
  gemini: "GEMINI_API_KEYS",
  "nvidia-nim": "NVIDIA_API_KEYS",
};

function getApiKey(provider: string): string {
  const envVar = envVarByProvider[provider];
  const raw = envVar ? process.env[envVar] : undefined;
  const key = raw?.split(",")[0]?.trim();
  if (!key) {
    throw new Error(
      `${envVar} belum diset di .env. Isi minimal 1 key ${provider} sebelum menjalankan server.`,
    );
  }
  return key;
}

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

  let apiKey: string;
  try {
    apiKey = getApiKey(body.provider);
  } catch (err) {
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
      const { status, body: errBody } = providerErrorToResponse(err);
      return c.json(errBody, status as 429 | 401 | 404 | 502 | 503);
    }
    throw err;
  }
});

export default app;
