import type { ChatCompletionRequest, ProviderAdapter } from "./types";

/**
 * Adapter untuk Google AI Studio (Gemini API).
 * Menggunakan endpoint OpenAI Compatibility resmi Google:
 * - URL: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 * - Auth: Bearer <API_KEY>
 * - Format body & response: Standard OpenAI Chat completions JSON & SSE stream.
 *
 * Catatan penting (checklist §9.2): Limit ditegakkan per Google Cloud Project,
 * bukan per API key. Dashboard harus memperhatikan `quotaScopeHint`.
 */
export const googleAdapter: ProviderAdapter = {
  id: "google-ai-studio",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  manifest: { name: "Google AI Studio", capabilities: { streaming: true, vision: true, toolCalling: true }, pricing: "freemium" },

  buildRequest(apiKey: string, req: ChatCompletionRequest): Request {
    const modelId = req.model || "gemini-2.5-flash-lite";

    return new Request(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...req,
        model: modelId,
      }),
    });
  },

  classifyError(response: Response) {
    if (response.status === 429) return "rate_limited";
    if (response.status === 401 || response.status === 403) return "auth_error";
    if (response.status === 404 || response.status === 410) return "decommissioned";
    if (response.status >= 500) return "server_error";
    return "ok";
  },
};

