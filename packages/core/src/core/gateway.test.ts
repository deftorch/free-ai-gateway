import { expect, test, mock, describe } from "bun:test";
import { processChatRequest } from "./gateway";

// Mocks for dependencies
mock.module("../auth", () => ({
  verifyGatewayTokenDetailed: mock(async (token) => {
    if (token === "Bearer valid-token") {
      return { valid: true, token: { id: "test-token-id", storeBody: true } };
    }
    return { valid: false, statusCode: 401, error: "Invalid token" };
  }),
  recordTokenUsage: mock(async () => {}),
}));

mock.module("../rate-limiter", () => ({
  checkClientRateLimit: mock(async (tokenId) => {
    if (tokenId === "test-token-id") {
      return { allowed: true, limit: 100, remaining: 99, resetSeconds: 60 };
    }
    return { allowed: false, limit: 100, remaining: 0, resetSeconds: 60 };
  }),
}));

mock.module("../router", () => ({
  resolveModelGroupTargets: mock(async (model, messages) => {
    if (model === "invalid-model") throw new Error("Model not found");
    if (model === "auto") {
      const msg = messages?.[0]?.content as string;
      if (msg && msg.includes("data:image")) {
         return [{ providerId: "google-ai-studio", modelId: "gemini" }];
      }
      return [{ providerId: "groq", modelId: "openai/gpt-oss-120b" }];
    }
    if (model === "kode-terbaik") {
      return [
        { providerId: "groq", modelId: "openai/gpt-oss-120b" },
        { providerId: "google-ai-studio", modelId: "gemini" }
      ];
    }
    if (model === "groq/openai/gpt-oss-120b") {
      return [{ providerId: "groq", modelId: "openai/gpt-oss-120b" }];
    }
    return [{ providerId: "test-provider", modelId: "test-model" }];
  }),
  routeChatCompletion: mock(async (targets, body) => {
    // Simulasi upstream response
    const mockResponse = new Response(JSON.stringify({ choices: [] }), {
      status: 200,
      headers: { "x-gateway-key-id": "mock-key", "content-type": "application/json" }
    });
    return { response: mockResponse, usedTarget: targets[0] };
  }),
  parseModelId: (raw: string) => {
    const idx = raw.indexOf("/");
    if (idx === -1) throw new Error(`Format model id tidak valid: "${raw}". Gunakan "provider/model".`);
    return { providerId: raw.slice(0, idx), modelId: raw.slice(idx + 1) };
  }
}));

mock.module("../events/client", () => ({
  emitRequestCompleted: mock(async () => {}),
}));

describe("Core Headless Engine (processChatRequest)", () => {
  test("Harus menolak request tanpa token yang valid (401)", async () => {
    const result = await processChatRequest({
      token: "Bearer invalid",
      body: { model: "gpt-4", messages: [{ role: "user", content: "hi" }] }
    });
    expect(result.statusCode).toBe(401);
    expect(result.body.error.type).toBe("unauthorized");
  });

  test("Harus menolak body yang tidak sesuai skema Zod (400)", async () => {
    const result = await processChatRequest({
      token: "Bearer valid-token",
      body: { model: "gpt-4" } // messages missing
    });
    expect(result.statusCode).toBe(400);
    expect(result.body.error.type).toBe("invalid_request");
  });

  test("Harus berhasil meroute request yang valid (200)", async () => {
    const result = await processChatRequest({
      token: "Bearer valid-token",
      body: { model: "gpt-4", messages: [{ role: "user", content: "hi" }] }
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");
    expect(result.stream).toBe(true); // Karena passthrough dari fetch Response
  });
});
