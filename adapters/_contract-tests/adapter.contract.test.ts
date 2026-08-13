/**
 * Satu suite test yang dijalankan terhadap SEMUA provider adapter, memakai fixture
 * response nyata di ./fixtures/<provider-id>/. Jangan buat contract test terpisah
 * per adapter — tujuannya justru memastikan semua adapter memenuhi behavior yang
 * SAMA dari packages/core/src/adapter.contract.ts.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ProviderAdapter, ProviderError } from "../../packages/core/src/adapter.contract";
import { nvidiaNimAdapter } from "../nvidia-nim/src/adapter";
import { geminiAdapter } from "../gemini/src/adapter";

const adaptersToTest: ProviderAdapter[] = [nvidiaNimAdapter, geminiAdapter];
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn().mockImplementation(async (url: string | Request | URL, options?: RequestInit) => {
    const urlStr = url.toString();
    
    let providerId = "unknown";
    if (urlStr.includes("nvidia.com")) providerId = "nvidia-nim";
    if (urlStr.includes("generativelanguage.googleapis.com")) providerId = "gemini";

    const headers = options?.headers as Record<string, string> || {};
    const apiKey = headers["Authorization"] || headers["x-goog-api-key"];
    
    // Simulate 429 error if a specific API key is used
    if (apiKey && apiKey.includes("trigger-429")) {
      return new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), { status: 429 });
    }

    let fixtureName = "";
    if (urlStr.endsWith("/models")) {
      fixtureName = "list-models.json";
    } else if (urlStr.includes("/chat/completions") || urlStr.includes(":generateContent") || urlStr.includes(":streamGenerateContent")) {
      let isStream = false;
      if (options?.body) {
         try {
           const body = JSON.parse(options.body as string);
           isStream = !!body.stream;
         } catch(e) {}
      }
      if (urlStr.includes(":streamGenerateContent")) {
         isStream = true;
      }
      fixtureName = isStream ? "chat-completion-stream.txt" : "chat-completion-nonstream.json";
    }

    if (!fixtureName) {
      throw new Error(`No fixture mapped for URL: ${urlStr}`);
    }

    const fixturePath = join(__dirname, "fixtures", providerId, fixtureName);
    const content = readFileSync(fixturePath, "utf-8");

    if (fixtureName.endsWith(".json")) {
      return new Response(content, { status: 200, headers: { "Content-Type": "application/json" } });
    } else {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        },
      });
      return new Response(readableStream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe.each(adaptersToTest)("Contract: $providerId adapter", (adapter) => {
  it("listModels() mengembalikan minimal 1 model dari fixture nyata", async () => {
    const models = await adapter.listModels("dummy-key");
    expect(models.length).toBeGreaterThan(0);
    // Verifikasi bahwa field id terekstrak dengan benar
    expect(models[0]).toHaveProperty("id");
  });

  it("chatCompletion() memparsing respons non-stream dengan benar", async () => {
    const result = await adapter.chatCompletion("dummy-key", {
      model: "dummy-model",
      messages: [{ role: "user", content: "test" }]
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("text");
    expect(result.text).toBeTypeOf("string");
  });

  it("chatCompletion() melempar ProviderError berkategori rate_limited saat fixture 429", async () => {
    await expect(adapter.chatCompletion("trigger-429", {
      model: "dummy-model",
      messages: [{ role: "user", content: "test" }]
    })).rejects.toThrowError(ProviderError);
    
    try {
      await adapter.chatCompletion("trigger-429", {
        model: "dummy-model",
        messages: [{ role: "user", content: "test" }]
      });
    } catch (error: any) {
      expect(error.kind).toBe("rate_limited");
    }
  });

  it("chatCompletionStream() menghasilkan minimal 1 chunk untuk fixture streaming", async () => {
    const stream = adapter.chatCompletionStream("dummy-key", {
      model: "dummy-model",
      messages: [{ role: "user", content: "test" }]
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty("deltaText");
  });
});
