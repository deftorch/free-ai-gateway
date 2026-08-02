import { describe, it, expect } from "bun:test";
import { FreeAIGatewayClient } from "free-ai-gateway-sdk";

describe("Standalone Client SDK Package (packages/free-ai-gateway-sdk)", () => {
  it("harus dapat diinstansiasi dengan parameter gatewayToken", () => {
    const client = new FreeAIGatewayClient({
      gatewayToken: "gw_test_token_9999",
      baseURL: "http://localhost:3000/v1",
    });

    expect(client).toBeDefined();
    expect(client.chat).toBeDefined();
    expect(client.messages).toBeDefined();
    expect(client.embeddings).toBeDefined();
    expect(client.models).toBeDefined();
    expect(client.quota).toBeDefined();
  });

  it("harus mendukung alias apiKey", () => {
    const client = new FreeAIGatewayClient({
      apiKey: "gw_test_token_8888",
    });

    expect(client).toBeDefined();
  });
});
