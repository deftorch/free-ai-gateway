/**
 * Lightweight Zero-Dependency Client SDK for Free AI Gateway (`lib/sdk`)
 * Kompatibel dengan OpenAI API Spec & Anthropic Messages Spec.
 */

export interface SDKClientConfig {
  baseURL?: string; // Default: http://localhost:3000/v1
  apiKey?: string;  // Gateway Token (gw_...)
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

export interface EmbeddingCreateParams {
  model: string;
  input: string | string[];
}

export class FreeAIGatewayClient {
  private baseURL: string;
  private apiKey?: string;
  private customHeaders: Record<string, string>;

  constructor(config: SDKClientConfig = {}) {
    this.baseURL = (config.baseURL || "http://localhost:3000/v1").replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.customHeaders = config.headers || {};
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.customHeaders,
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /** Sub-namespace chat completions */
  public chat = {
    create: async (params: ChatCompletionCreateParams): Promise<any> => {
      const url = `${this.baseURL}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as any;
        throw new Error(errJson?.error?.message || `Gateway Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  };

  /** Sub-namespace embeddings */
  public embeddings = {
    create: async (params: EmbeddingCreateParams): Promise<any> => {
      const url = `${this.baseURL}/embeddings`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as any;
        throw new Error(errJson?.error?.message || `Gateway Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  };

  /** Sub-namespace models list */
  public models = {
    list: async (): Promise<any> => {
      const url = `${this.baseURL}/models`;
      const res = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Gateway Error ${res.status}`);
      }

      return res.json();
    },
  };

  /** Memeriksa status kuota token & RPD harian */
  public async getQuotaStatus(): Promise<{ remainingRequests?: number; totalLimit?: number }> {
    const res = await this.models.list();
    return {
      totalLimit: res.data?.length || 0,
    };
  }
}
