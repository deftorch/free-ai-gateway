/**
 * Kontrak adapter provider. Tiap provider (bagian 3.1 & 6 dokumen desain)
 * wajib mengimplementasikan ini supaya router (lib/router) tidak perlu tahu
 * detail format tiap provider.
 */
export interface ChatMessage {
  role: string;
  content: unknown;
}

export interface ChatCompletionRequest {
  model: string; // model id TANPA prefix provider, mis. "openai/gpt-oss-120b"
  messages: Array<ChatMessage>;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown; // field OpenAI lain diteruskan apa adanya
}

export type ProviderErrorType = "rate_limited" | "auth_error" | "decommissioned" | "server_error" | "ok";

export interface ProviderManifest {
  name: string;
  capabilities: {
    streaming: boolean;
    vision: boolean;
    toolCalling: boolean;
  };
  pricing?: "free" | "freemium" | "free-tier-available" | "paid"; // Wajib eksplisit, tidak nebak-nebak
}

export interface ProviderAdapter {
  id: string; // harus sama dengan providers.id di DB
  baseUrl: string;
  manifest: ProviderManifest; // Manifest wajib ada

  /**
   * Bangun Request ke provider asli dari request format OpenAI.
   * Adapter yang sudah OpenAI-compatible (Groq, OpenRouter) cukup
   * meneruskan body + ganti header auth; provider lain (mis. Google AI Studio)
   * perlu translasi skema penuh di sini.
   */
  buildRequest(apiKey: string, req: ChatCompletionRequest): Request;

  /**
   * Provider bisa punya cara berbeda menandai rate limit/auth error di luar
   * status code standar (mis. body error tertentu). Default: pakai status code.
   */
  classifyError?(response: Response): ProviderErrorType;
}

export class ProviderHttpError extends Error {
  constructor(
    public status: number,
    public providerId: string,
    public retryAfterMs?: number,
    message?: string
  ) {
    super(message ?? `Provider ${providerId} returned ${status}`);
  }
}
