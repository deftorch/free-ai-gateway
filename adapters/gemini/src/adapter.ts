/**
 * Adapter Gemini — implementasi ProviderAdapter (packages/core/src/adapter.contract.ts)
 * untuk Google Gemini API.
 *
 * Referensi format yang dipakai (diverifikasi Agustus 2026, lihat catatan di bawah
 * karena field/endpoint Gemini pernah berubah — jangan percaya begitu saja pada
 * pengetahuan lama soal API ini):
 * - Non-streaming: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * - Streaming:     POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse
 * - Auth: header `x-goog-api-key: <key>` (bukan Bearer token, bukan query param ?key=
 *   walau ?key= juga masih diterima di banyak endpoint Google — kita pakai header
 *   karena itu yang direkomendasikan dokumentasi resmi saat ini)
 * - Gemini pakai role "user"/"model" di `contents[]`, BUKAN "system"/"assistant"
 *   seperti OpenAI — pesan role "system" dari klien dipindah ke field terpisah
 *   `systemInstruction`.
 * - `usageMetadata` di response streaming bersifat KUMULATIF tiap chunk — ambil
 *   nilai dari chunk TERAKHIR, jangan dijumlah manual per chunk.
 */

import type {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionChunk,
  ModelInfo,
} from "@free-ai-gateway/core";
import { ProviderError } from "@free-ai-gateway/core";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Timeout eksplisit -- tanpa ini, fetch bisa menggantung tanpa batas kalau
// jaringan bermasalah/provider tidak merespons, membekukan request klien
// selamanya. 30s cukup longgar untuk non-streaming; streaming pertama byte
// juga dibatasi timeout yang sama (bukan total durasi stream).
const FETCH_TIMEOUT_MS = 30_000;

// --- Tipe request/response Gemini (subset yang dipakai Step 0) ---

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiContentPart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GeminiCandidate {
  content: { parts: GeminiContentPart[]; role: string };
  finishReason?: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
  index: number;
}

interface GeminiGenerateContentResponse {
  candidates: GeminiCandidate[];
  usageMetadata: GeminiUsageMetadata;
  modelVersion?: string;
  responseId?: string;
}

interface GeminiErrorBody {
  error: {
    code: number;
    message: string;
    status: string; // mis. "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "NOT_FOUND"
    details?: Array<{
      "@type": string;
      retryDelay?: string; // e.g. "9s", "34s"
      [key: string]: unknown;
    }>;
  };
}

interface GeminiListModelsResponse {
  models: Array<{
    name: string; // format "models/gemini-3.5-flash"
    displayName: string;
    supportedGenerationMethods: string[];
  }>;
}

// --- Helper: translasi request generic -> format Gemini ---

function toGeminiRequest(request: ChatCompletionRequest): GeminiGenerateContentRequest {
  const systemParts = request.messages
    .filter((m) => m.role === "system")
    .map((m) => ({ text: m.content }));

  const contents: GeminiContent[] = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return {
    contents,
    ...(systemParts.length > 0 ? { systemInstruction: { parts: systemParts } } : {}),
    generationConfig: {
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      ...(request.maxTokens !== undefined ? { maxOutputTokens: request.maxTokens } : {}),
    },
  };
}

function mapFinishReason(
  reason: GeminiCandidate["finishReason"],
): "stop" | "length" | "content_filter" {
  if (reason === "MAX_TOKENS") return "length";
  if (reason === "SAFETY" || reason === "RECITATION") return "content_filter";
  return "stop"; // STOP, OTHER, atau undefined -> default paling aman
}

/** Klasifikasi error Gemini -> kategori generik ProviderError (dipakai key pool manager). */
function toProviderError(response: Response, body: GeminiErrorBody | null): ProviderError {
  const status = response.status;
  const message = body?.error?.message ?? `Gemini API error, HTTP ${status}`;
  const googleStatus = body?.error?.status;

  if (status === 429 || googleStatus === "RESOURCE_EXHAUSTED") {
    let retryAfterMs: number | undefined;

    // Sumber utama: error.details dari body JSON (kebiasaan nyata Gemini)
    const retryInfo = body?.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"));
    if (retryInfo?.retryDelay) {
      // Format dari google.rpc.Duration adalah string berakhiran "s", misal "34s"
      const secondsStr = retryInfo.retryDelay.replace("s", "");
      const parsed = parseFloat(secondsStr);
      if (!isNaN(parsed)) {
        retryAfterMs = parsed * 1000;
      }
    }

    // Fallback: cek HTTP header Retry-After
    if (retryAfterMs === undefined) {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          retryAfterMs = parsed * 1000;
        }
      }
    }

    return new ProviderError(message, "rate_limited", retryAfterMs);
  }
  if (status === 401 || status === 403 || googleStatus === "PERMISSION_DENIED") {
    // SENGAJA belum ada: Penanganan kind: "auth_failed" (nonaktif permanen) (Step TBD)
    return new ProviderError(message, "auth_failed");
  }
  if (status === 404 || googleStatus === "NOT_FOUND") {
    return new ProviderError(message, "model_not_found");
  }
  return new ProviderError(message, "upstream_error");
}

async function parseErrorResponse(response: Response): Promise<GeminiErrorBody | null> {
  try {
    return (await response.json()) as GeminiErrorBody;
  } catch {
    return null; // body bukan JSON valid -- tetap lempar ProviderError generik di caller
  }
}

// --- Adapter ---

export const geminiAdapter: ProviderAdapter = {
  providerId: "gemini",

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_BASE_URL}/models`, {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi Gemini API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response, await parseErrorResponse(response));
    }

    const data = (await response.json()) as GeminiListModelsResponse;
    return data.models
      .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => ({
        id: m.name.replace(/^models\//, ""),
        displayName: m.displayName,
        // NOTE: Gemini tidak expose status "gratis/berbayar" lewat endpoint ini.
        // Gateway ini fokus tier gratis (§10), jadi ditandai true di sini sebagai
        // penyederhanaan Step 0 -- perlu diverifikasi ulang terhadap kuota nyata
        // saat Provider Registry Sync (Step 12) dikerjakan.
        isFree: true,
      }));
  },

  async chatCompletion(
    apiKey: string,
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResult> {
    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_BASE_URL}/models/${request.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(toGeminiRequest(request)),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi Gemini API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response, await parseErrorResponse(response));
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const candidate = data.candidates[0];
    if (!candidate) {
      throw new ProviderError("Gemini API tidak mengembalikan candidate apa pun", "upstream_error");
    }

    const text = candidate.content.parts.map((p) => p.text).join("");

    return {
      id: data.responseId ?? crypto.randomUUID(),
      model: data.modelVersion ?? request.model,
      text,
      finishReason: mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
      },
    };
  },

  async *chatCompletionStream(
    apiKey: string,
    request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk> {
    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_BASE_URL}/models/${request.model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(toGeminiRequest(request)),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
    } catch (err) {
      throw new ProviderError(
        `Gagal menghubungi Gemini API: ${(err as Error).message}`,
        "network_error",
      );
    }

    if (!response.ok) {
      throw toProviderError(response, await parseErrorResponse(response));
    }
    if (!response.body) {
      throw new ProviderError("Gemini API tidak mengembalikan response body streaming", "upstream_error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const id = crypto.randomUUID();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // baris terakhir mungkin belum lengkap, simpan untuk chunk berikutnya

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice("data: ".length).trim();
          if (!jsonStr) continue;

          const parsed = JSON.parse(jsonStr) as GeminiGenerateContentResponse;
          const candidate = parsed.candidates?.[0];
          if (!candidate) continue;

          const deltaText = candidate.content.parts.map((p) => p.text).join("");

          yield {
            id,
            model: parsed.modelVersion ?? request.model,
            deltaText,
            finishReason: candidate.finishReason ? mapFinishReason(candidate.finishReason) : null,
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
