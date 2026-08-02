import { describe, expect, it } from "bun:test";
import { chatCompletionSchema, anthropicMessagesSchema, embeddingsSchema, validateRequestBody } from "./schemas";
import { checkClientRateLimit } from "../rate-limiter";

describe("Validation & Rate Limiting Suite (Fase A)", () => {
  it("chatCompletionSchema harus memvalidasi request valid", () => {
    const validData = {
      model: "groq/openai/gpt-oss-120b",
      messages: [{ role: "user", content: "Halo AI" }],
      stream: true,
    };
    const result = validateRequestBody(chatCompletionSchema, validData);
    expect(result.success).toBe(true);
  });

  it("chatCompletionSchema harus menolak jika 'model' atau 'messages' hilang", () => {
    const invalidData = {
      messages: [{ role: "user", content: "Tanpa model" }],
    };
    const result = validateRequestBody(chatCompletionSchema, invalidData);
    expect(result.success).toBe(false);
  });

  it("anthropicMessagesSchema harus memvalidasi request Anthropic", () => {
    const validData = {
      model: "claude-3-5-sonnet",
      messages: [{ role: "user", content: "Halo Anthropic" }],
      max_tokens: 1024,
    };
    const result = validateRequestBody(anthropicMessagesSchema, validData);
    expect(result.success).toBe(true);
  });

  it("embeddingsSchema harus memvalidasi input embedding", () => {
    const validData = {
      model: "text-embedding-3-small",
      input: "Halo Dunia",
    };
    const result = validateRequestBody(embeddingsSchema, validData);
    expect(result.success).toBe(true);
  });

  it("checkClientRateLimit harus mengizinkan request di bawah limit", async () => {
    const rateLimit = await checkClientRateLimit("test-token-id-123", 10);
    expect(rateLimit.allowed).toBe(true);
    expect(rateLimit.limit).toBe(10);
  });
});
