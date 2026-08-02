import { describe, it, expect } from "bun:test";
import { logRequest } from "./index";

describe("Async Request Logging", () => {
  it("harus mengeksekusi logRequest tanpa melempar error walau DB/KV tidak tersedia", async () => {
    expect(async () => {
      await logRequest({
        gatewayTokenId: "test-token-id",
        modelRequested: "groq/openai/gpt-oss-120b",
        modelUsed: "groq/openai/gpt-oss-120b",
        statusCode: 200,
        latencyMs: 150,
        storeBody: true,
        prompt: [{ role: "user", content: "hello test" }],
      });
    }).not.toThrow();
  });

  it("harus mengeksekusi logRequest dengan storeBody false secara aman", async () => {
    expect(async () => {
      await logRequest({
        modelRequested: "openrouter/qwen-free",
        statusCode: 500,
        storeBody: false,
      });
    }).not.toThrow();
  });
});
