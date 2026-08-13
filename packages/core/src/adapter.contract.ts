/**
 * Kontrak yang wajib dipenuhi setiap provider adapter di adapters/<provider>/.
 *
 * File ini ditulis dan diubah oleh manusia (lihat CLAUDE.md root, aturan keras poin 3).
 * Agen boleh mengimplementasikan adapter BARU yang memenuhi kontrak ini, tapi
 * TIDAK boleh mengubah kontrak ini sendiri tanpa diskusi eksplisit — perubahan di sini
 * berdampak ke semua adapter sekaligus.
 *
 * Semua adapter WAJIB lulus contract test yang sama di
 * adapters/_contract-tests/adapter.contract.test.ts, dijalankan terhadap fixture
 * response NYATA (bukan bentuk response yang ditebak) — lihat adapters/CLAUDE.md.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  deltaText: string;
  finishReason: "stop" | "length" | "content_filter" | null;
}

export interface ChatCompletionResult {
  id: string;
  model: string;
  text: string;
  finishReason: "stop" | "length" | "content_filter";
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ModelInfo {
  id: string;
  displayName: string;
  isFree: boolean;
}

/** Error terstruktur yang WAJIB dilempar adapter — bukan error mentah dari HTTP client. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "rate_limited" // 429 / RESOURCE_EXHAUSTED -> key pool manager akan cooldown key ini
      | "auth_failed" // key invalid/expired -> nonaktifkan key, jangan retry otomatis
      | "model_not_found" // model dihapus dari katalog provider -> nonaktifkan dari registry lokal
      | "upstream_error" // error provider yang tidak masuk kategori di atas
      | "network_error",
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Kontrak inti. Satu implementasi per provider di adapters/<provider>/src/adapter.ts.
 */
export interface ProviderAdapter {
  readonly providerId: string; // mis. "gemini", "groq" — harus cocok dengan nama folder adapters/<providerId>/

  /** Daftar model yang tersedia dari provider ini SAAT INI (dipanggil health-check, bukan hardcode). */
  listModels(apiKey: string): Promise<ModelInfo[]>;

  /** Non-streaming completion. */
  chatCompletion(
    apiKey: string,
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResult>;

  /** Streaming completion — WAJIB diimplementasikan, bukan opsional (§3 MVP: dukungan streaming). */
  chatCompletionStream(
    apiKey: string,
    request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk>;
}
