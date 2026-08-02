import type { ChatCompletionRequest, ProviderAdapter } from "./types";

/**
 * Custom / Local LLM Provider Adapter (OpenAI-Compatible).
 * Mendukung Ollama, LM Studio, vLLM, LocalAI, atau reverse proxy kustom.
 */
export function createCustomAdapter(baseUrl: string): ProviderAdapter {
  // Normalisasi baseUrl (tanpa trailing slash)
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    id: "custom",
    baseUrl: normalizedBaseUrl,
    manifest: { name: "Custom Provider", capabilities: { streaming: true, vision: true, toolCalling: true }, pricing: "free" },

    buildRequest(apiKey: string, req: ChatCompletionRequest) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey && apiKey.trim() !== "") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const targetUrl = normalizedBaseUrl.endsWith("/chat/completions")
        ? normalizedBaseUrl
        : `${normalizedBaseUrl}/chat/completions`;

      return new Request(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
    },
  };
}

export const customAdapter: ProviderAdapter = createCustomAdapter("http://localhost:11434/v1");
