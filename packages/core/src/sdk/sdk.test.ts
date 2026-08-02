import { describe, it, expect } from "bun:test";
import { FreeAIGatewayClient } from "./index";

describe("Lightweight SDK Client Library Suite (lib/sdk)", () => {
  it("harus menginstansiasi FreeAIGatewayClient dengan baseURL dan apiKey yang benar", () => {
    const client = new FreeAIGatewayClient({
      baseURL: "http://localhost:3000/v1/",
      apiKey: "gw_test_123",
    });

    expect(client).toBeDefined();
    expect(client.chat).toBeDefined();
    expect(client.embeddings).toBeDefined();
    expect(client.models).toBeDefined();
  });
});
