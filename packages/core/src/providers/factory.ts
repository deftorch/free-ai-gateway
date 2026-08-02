import type { ChatCompletionRequest, ProviderAdapter, ProviderErrorType, ProviderManifest } from "./types";

export interface OpenAIAdapterConfig {
  /** Identifier unik provider (mis. 'groq', 'cerebras') */
  id: string;
  /** Base URL API endpoint OpenAI-compatible */
  baseUrl: string;
  /** Manifest kapabilitas (wajib) */
  manifest: ProviderManifest;
  /** Endpoint path (default: '/chat/completions') */
  endpointPath?: string;
  /**
   * Header opsional tambahan (mis. 'HTTP-Referer' untuk OpenRouter, 'X-Title').
   * Bisa berupa object statis, atau function yang dievaluasi per-request
   * (dibutuhkan untuk DI: header yang bergantung pada env, mis.
   * `GATEWAY_PUBLIC_URL`, tidak boleh "dibekukan" di waktu import modul —
   * lihat providers/openrouter.ts).
   */
  defaultHeaders?: Record<string, string> | (() => Record<string, string>);
  /** Custom error classifier opsional */
  classifyError?: (response: Response) => ProviderErrorType;
}

/**
 * Factory function untuk membuat ProviderAdapter standar yang 100% kompatibel
 * dengan OpenAI REST API Format (/chat/completions).
 * Mengeliminasi duplikasi boilerplate pada belasan adapter provider.
 */
export function createOpenAICompatibleAdapter(config: OpenAIAdapterConfig): ProviderAdapter {
  return {
    id: config.id,
    baseUrl: config.baseUrl,
    manifest: config.manifest,

    buildRequest(apiKey: string, req: ChatCompletionRequest): Request {
      const resolvedDefaultHeaders =
        typeof config.defaultHeaders === "function" ? config.defaultHeaders() : config.defaultHeaders;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...resolvedDefaultHeaders,
      };

      const path = config.endpointPath ?? "/chat/completions";

      return new Request(`${this.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
    },

    classifyError(response: Response): ProviderErrorType {
      if (config.classifyError) {
        return config.classifyError(response);
      }
      if (response.status === 429) return "rate_limited";
      if (response.status === 401 || response.status === 403) return "auth_error";
      if (response.status === 404 || response.status === 410) return "decommissioned";
      if (response.status >= 500) return "server_error";
      return "ok";
    },
  };
}
