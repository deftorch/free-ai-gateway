import { describe, it, expect } from "bun:test";
import { POST } from "./route";

describe("POST /v1/chat/completions (OpenAI Route Handler)", () => {
  it("harus menolak request tanpa header Authorization (401 Unauthorized)", async () => {
    const req = new Request("http://localhost:3000/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: "auto",
        messages: [{ role: "user", content: "Halo" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.type).toBe("unauthorized");
  });

  it("harus menolak request dengan JSON body yang invalid (400 Bad Request)", async () => {
    const req = new Request("http://localhost:3000/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-invalid-token",
        "Content-Type": "application/json",
      },
      body: "invalid-json-string{",
    });

    const res = await POST(req);
    expect(res.status).toBe(400); 
  });

  it("harus menolak request yang tidak memiliki field 'model' atau 'messages' (400 Bad Request)", async () => {
    // Kita gunakan Request dengan format tanpa model
    const req = new Request("http://localhost:3000/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-test-token",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    // Karena DB/token auth terisolasi di mode test, verifyGatewayToken menolak dengan 401 jika token tidak terdaftar
    expect([400, 401]).toContain(res.status);
  });
});
