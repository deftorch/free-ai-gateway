import { describe, it, expect } from "bun:test";
import { POST } from "./route";

describe("POST /v1/messages (Anthropic Messages API Surface Route Handler)", () => {
  it("harus menolak request tanpa header Auth / x-api-key (401 Unauthorized)", async () => {
    const req = new Request("http://localhost:3000/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: "Halo Claude" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.type).toBe("error");
    expect(json.error.type).toBe("authentication_error");
  });

  it("harus mendukung pengiriman x-api-key header untuk kompatibilitas Anthropic SDK/Claude CLI", async () => {
    const req = new Request("http://localhost:3000/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": "invalid-anthropic-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "auto",
        messages: [{ role: "user", content: "Test prompt" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.type).toBe("authentication_error");
  });

  it("harus mengembalikan error format Anthropic jika JSON body corrupt", async () => {
    const req = new Request("http://localhost:3000/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": "test-key",
      },
      body: "not-a-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400); // Json body corrupt
  });
});
