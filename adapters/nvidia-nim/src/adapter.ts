/**
 * Adapter NVIDIA NIM — implementasi ProviderAdapter untuk build.nvidia.com /
 * integrate.api.nvidia.com.
 *
 * Referensi format yang dipakai (diverifikasi Agustus 2026 lewat web search,
 * lihat catatan sama seperti adapter Gemini soal jangan percaya ingatan lama):
 * - Base URL: https://integrate.api.nvidia.com/v1
 * - Endpoint: POST /chat/completions -- SUDAH OpenAI-compatible penuh (request
 *   & response shape sama persis dengan OpenAI Chat Completions), jadi adapter
 *   ini jauh lebih tipis dari adapter Gemini -- hampir tidak ada translasi.
 * - Auth: header `Authorization: Bearer <key>` (bukan header custom seperti
 *   Gemini `x-goog-api-key`).
 * - Model ID berformat namespace, mis. `meta/llama-3.3-70b-instruct`,
 *   `deepseek-ai/deepseek-r1` -- BUKAN sesuatu yang di-hardcode di sini, klien
 *   yang menentukan lewat field `model` di request.
 * - Streaming: SSE standar OpenAI (`data: {...}\n\n` ... `data: [DONE]\n\n`),
 *   BUKAN format custom seperti Gemini.
 */

import type {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionChunk,
  ModelInfo,
} from "@free-ai-gateway/core";
import { ProviderError } from "@free-ai-gateway/core";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const FETCH_TIMEOUT_MS = 30_000;

// --- Tipe request/response (subset OpenAI Chat Completions yang dipakai) ---

interface OpenAICompatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAICompatChatRequest {
  model: string;
  messages: OpenAICompatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAICompatChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: "stop" | "length" | "content_filter" | null;
}

interface OpenAICompatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAICompatChatResponse {
  id: string;
  model: string;
  choices: OpenAICompatChoice[];
  usage: OpenAICompatUsage;
}

interface OpenAICompatStreamChoice {
  index: number;
  delta: { content?: string };
  finish_reason: "stop" | "length" | "content_filter" | null;
}

interface OpenAICompatStreamChunk {
  id: string;
  model: string;
  choices: OpenAICompatStreamChoice[];
}

interface OpenAICompatErrorBody {
  error: { message: string; type?: string; code?: string };
}

interface OpenAICompatModelsResponse {
  data: Array<{ id: string }>;
}

function mapFinishReason(
  reason: OpenAICompatChoice["finish_reason"],
): "stop" | "length" | "content_filter" {
  if (reason === "length") return "length";
  if (reason === "content_filter") return "content_filter";
  return "stop";
}

/** Klasifikasi error -> kategori generik ProviderError. Format error NVIDIA
 * mengikuti konvensi OpenAI: status HTTP jadi sinyal utama, bukan `type`. */
function toProviderError(status: number, body: OpenAICompatErrorBody | null): ProviderError {
  const message = body?.error?.message ?? `NVIDIA NIM API error, HTTP ${status}`;

  if (status === 429) return new ProviderError(message, "rate_limited");
  if (status === 401 || status === 403) return new ProviderError(message, "auth_failed");
  if (status === 404) return new ProviderError(message, "model_not_found");
  return new ProviderError(message, "upstream_error");
}

async function parseErrorResponse(response: Response): Promise<OpenAICompatErrorBody | null> {
  try {
    return (await response.json()) as OpenAICompatErrorBody;
  } catch {
    return null;
  }
}

function toOpenAICompatRequest(request: ChatCompletionRequest): OpenAICompatChatRequest {
  return {
    model: request.model,
    messages: request.messages,
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
  };
}

export const nvidiaNimAdapter: ProviderAdapter = {
  providerId: "nvidia-nim",

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    let response: Response;
    try {
      response = await fetch(`${NVIDIA_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi NVIDIA NIM API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response.status, await parseErrorResponse(response));
    }

    const data = (await response.json()) as OpenAICompatModelsResponse;
    return data.data.map((m) => ({
      id: m.id,
      displayName: m.id,
      // NOTE: sama seperti adapter Gemini, endpoint ini tidak expose status
      // gratis/berbayar secara eksplisit. Katalog NVIDIA NIM mencampur model
      // gratis (kredit developer) dan model yang butuh entitlement berbayar --
      // penyederhanaan Step 1, perlu diverifikasi ulang di Provider Registry
      // Sync (Step 12) sebelum dipakai sebagai keputusan produksi.
      isFree: true,
    }));
  },

  async chatCompletion(
    apiKey: string,
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResult> {
    let response: Response;
    try {
      response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(toOpenAICompatRequest(request)),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi NVIDIA NIM API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response.status, await parseErrorResponse(response));
    }

    const data = (await response.json()) as OpenAICompatChatResponse;
    const choice = data.choices[0];
    if (!choice) {
      throw new ProviderError("NVIDIA NIM API tidak mengembalikan choice apa pun", "upstream_error");
    }

    return {
      id: data.id,
      model: data.model,
      text: choice.message.content,
      finishReason: mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    };
  },

  async *chatCompletionStream(
    apiKey: string,
    request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk> {
    let response: Response;
    try {
      response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...toOpenAICompatRequest(request), stream: true }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi NVIDIA NIM API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response.status, await parseErrorResponse(response));
    }
    if (!response.body) {
      throw new ProviderError("NVIDIA NIM API tidak mengembalikan response body streaming", "upstream_error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice("data: ".length).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue; // [DONE] bukan JSON, penanda akhir stream OpenAI

          const parsed = JSON.parse(jsonStr) as OpenAICompatStreamChunk;
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          yield {
            id: parsed.id,
            model: parsed.model,
            deltaText: choice.delta.content ?? "",
            finishReason: choice.finish_reason ? mapFinishReason(choice.finish_reason) : null,
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
