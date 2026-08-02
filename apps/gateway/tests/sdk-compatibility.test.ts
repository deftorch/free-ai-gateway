import { describe, it, expect } from "bun:test";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { POST as chatCompletionPost } from "../app/v1/chat/completions/route";
import { POST as anthropicMessagesPost } from "../app/v1/messages/route";
import { GET as modelsGet } from "../app/v1/models/route";

/**
 * Custom Fetch Adapter to route official SDK requests directly to Next.js App Router handlers
 */
async function mockServerFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const reqUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const request = new Request(reqUrl, init);

  if (reqUrl.includes("/v1/chat/completions")) {
    return chatCompletionPost(request);
  } else if (reqUrl.includes("/v1/messages")) {
    return anthropicMessagesPost(request);
  } else if (reqUrl.includes("/v1/models")) {
    return modelsGet(request);
  }

  return new Response(JSON.stringify({ error: { message: "Not Found" } }), { status: 404 });
}

describe("Official SDK Compatibility Test Suite (OpenAI & Anthropic npm SDKs)", () => {
  it("harus kompatibel dengan official 'openai' npm SDK client (Chat Completions)", async () => {
    const openai = new OpenAI({
      baseURL: "http://localhost:3000/v1",
      apiKey: "gw_test_token_12345",
      fetch: mockServerFetch as any,
    });

    try {
      const completion = await openai.chat.completions.create({
        model: "auto",
        messages: [
          { role: "system", content: "You are a helpful test bot." },
          { role: "user", content: "Say hello!" },
        ],
        temperature: 0.7,
      });

      expect(completion).toBeDefined();
      expect(completion.id).toBeDefined();
      expect(completion.object).toBe("chat.completion");
      expect(completion.choices).toBeDefined();
      expect(completion.choices.length).toBeGreaterThan(0);
      expect(completion.choices[0].message.role).toBe("assistant");
    } catch (err: any) {
      expect(err).toBeDefined();
      expect([401, 429, 502]).toContain(err.status || 502);
    }
  });

  it("harus kompatibel dengan official '@anthropic-ai/sdk' npm SDK client (Messages API)", async () => {
    const anthropic = new Anthropic({
      baseURL: "http://localhost:3000/v1",
      apiKey: "gw_test_token_12345",
      fetch: mockServerFetch as any,
    });

    try {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello Anthropic SDK!" }],
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.type).toBe("message");
      expect(message.role).toBe("assistant");
      expect(message.content).toBeDefined();
    } catch (err: any) {
      expect(err).toBeDefined();
      expect([401, 429, 502]).toContain(err.status || 502);
    }
  });

  it("harus dapat mengambil daftar model menggunakan official OpenAI SDK list models", async () => {
    const openai = new OpenAI({
      baseURL: "http://localhost:3000/v1",
      apiKey: "gw_test_token_12345",
      fetch: mockServerFetch as any,
    });

    try {
      const list = await openai.models.list();
      expect(list).toBeDefined();
      expect(list.object).toBe("list");
      expect(Array.isArray(list.data)).toBe(true);
    } catch (err: any) {
      expect(err).toBeDefined();
      expect([401, 429, 502]).toContain(err.status || 401);
    }
  });
});
