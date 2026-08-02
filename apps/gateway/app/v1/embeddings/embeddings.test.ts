import { describe, it, expect } from "bun:test";
import { POST } from "./route";

describe("POST /v1/embeddings (OpenAI Embeddings API Surface)", () => {
  it("harus menolak request tanpa header Authorization (401)", async () => {
    const req = new Request("http://localhost:3000/v1/embeddings", {
      method: "POST",
      body: JSON.stringify({
        model: "groq/text-embedding-3-small",
        input: "Hello world",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("harus menolak request yang tidak memiliki field 'input' atau 'model' (400 / 401)", async () => {
    const req = new Request("http://localhost:3000/v1/embeddings", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ model: "groq/text-embedding-3-small" }),
    });

    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});
