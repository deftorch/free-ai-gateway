/**
 * Free AI Gateway Lightweight Zero-Dependency Client SDK (`free-ai-gateway-sdk`)
 * Compatible with OpenAI Chat Completions API Spec & Anthropic Messages Spec.
 */

export interface SDKClientConfig {
  /** Gateway Token created from dashboard (gw_...) */
  gatewayToken?: string;
  /** Alternative alias for gatewayToken */
  apiKey?: string;
  /** Base URL of Free AI Gateway (Default: http://localhost:3000/v1) */
  baseURL?: string;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
}

export interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown[];
  name?: string;
}

export interface ChatCompletionCreateParams {
  model: string | "auto" | "kode-terbaik" | "fastest-first" | "best-coding";
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AnthropicMessageCreateParams {
  model: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  max_tokens?: number;
  system?: string;
}

export interface EmbeddingCreateParams {
  model: string;
  input: string | string[];
}

export class FreeAIGatewayClient {
  private baseURL: string;
  private token?: string;
  private customHeaders: Record<string, string>;

  constructor(config: SDKClientConfig = {}) {
    this.baseURL = (config.baseURL || "http://localhost:3000/v1").replace(/\/$/, "");
    this.token = config.gatewayToken || config.apiKey;
    this.customHeaders = config.headers || {};
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.customHeaders,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
      headers["x-api-key"] = this.token;
    }
    return headers;
  }

  /** OpenAI Chat Completions Namespace */
  public chat = {
    completions: {
      create: async (params: ChatCompletionCreateParams): Promise<any> => {
        const url = `${this.baseURL}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Gateway Error ${res.status}: ${res.statusText}`);
        }

        return res.json();
      },
    },
  };

  /** Anthropic Messages Namespace */
  public messages = {
    create: async (params: AnthropicMessageCreateParams): Promise<any> => {
      const url = `${this.baseURL}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gateway Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  };

  /** Embeddings Namespace */
  public embeddings = {
    create: async (params: EmbeddingCreateParams): Promise<any> => {
      const url = `${this.baseURL}/embeddings`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gateway Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  };

  /** Models List Namespace */
  public models = {
    list: async (): Promise<any> => {
      const url = `${this.baseURL}/models`;
      const res = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Gateway Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  };

  /** Quota Status Check */
  public quota = {
    check: async (): Promise<any> => {
      const rootUrl = this.baseURL.replace(/\/v1$/, "");
      const url = `${rootUrl}/api/mcp`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "check_quota" },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gateway MCP Quota Check Error ${res.status}`);
      }

      const json = await res.json();
      const contentText = json.result?.content?.[0]?.text;
      return contentText ? JSON.parse(contentText) : json;
    },
  };
}

export default FreeAIGatewayClient;
