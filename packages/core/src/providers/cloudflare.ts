import type { ChatCompletionRequest, ProviderAdapter } from "./types";

/**
 * Cloudflare Workers AI Adapter
 * Mendukung eksekusi model free-tier Cloudflare Workers AI via endpoint OpenAI-compatible compatibility layer.
 */
export const cloudflareAdapter: ProviderAdapter = {
  id: "cloudflare",
  manifest: { name: "Cloudflare Workers AI", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "freemium" },
  baseUrl: "https://api.cloudflare.com/client/v4/accounts",

  buildRequest(apiKey, req: ChatCompletionRequest) {
    // API key format untuk Cloudflare bisa `ACCOUNT_ID:API_TOKEN` atau `API_TOKEN`
    let accountId = "default";
    let token = apiKey;

    if (apiKey.includes(":")) {
      const parts = apiKey.split(":");
      accountId = parts[0];
      token = parts[1];
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

    return new Request(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(req),
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
