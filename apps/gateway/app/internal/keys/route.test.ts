import { describe, it, expect } from "bun:test";
import { GET, POST, DELETE } from "./route";

describe("Internal API Keys Route Handler (/internal/keys)", () => {
  it("GET /internal/keys harus menolak request tanpa Internal Admin Auth Token (401)", async () => {
    const req = new Request("http://localhost:3000/internal/keys", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("POST /internal/keys harus menolak request tanpa Admin Auth Token (401)", async () => {
    const req = new Request("http://localhost:3000/internal/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "groq", label: "Test Key", rawKey: "gsk_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST /internal/keys harus memvalidasi field wajib providerId, label, dan rawKey (400)", async () => {
    // Dengan admin token yang disimulasikan via env
    const originalToken = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";

    const req = new Request("http://localhost:3000/internal/keys", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-secret-test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label: "Missing fields" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("wajib ada");

    process.env.INTERNAL_ADMIN_TOKEN = originalToken;
  });

  it("DELETE /internal/keys harus menolak request tanpa query param 'id' (400)", async () => {
    const originalToken = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";

    const req = new Request("http://localhost:3000/internal/keys", {
      method: "DELETE",
      headers: { Authorization: "Bearer admin-secret-test" },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Query param 'id' wajib ada");

    process.env.INTERNAL_ADMIN_TOKEN = originalToken;
  });
});
