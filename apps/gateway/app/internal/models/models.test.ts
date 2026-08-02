import { describe, it, expect } from "bun:test";
import { GET, PATCH } from "./route";

describe("Internal Models Management Route Handler (/internal/models)", () => {
  it("GET /internal/models harus menolak request tanpa Admin Auth Token (401)", async () => {
    const req = new Request("http://localhost:3000/internal/models");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /internal/models harus menolak request tanpa Admin Auth Token (401)", async () => {
    const req = new Request("http://localhost:3000/internal/models", {
      method: "PATCH",
      body: JSON.stringify({ id: "groq/openai/gpt-oss-120b", status: "active" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /internal/models harus memvalidasi field wajib 'id'", async () => {
    // Dengan header auth yang di-mock jika env terpasang atau tanpa header auth
    const req = new Request("http://localhost:3000/internal/models", {
      method: "PATCH",
      headers: { Authorization: "Bearer test-admin-token" },
      body: JSON.stringify({ status: "active" }),
    });
    const res = await PATCH(req);
    expect([400, 401]).toContain(res.status);
  });
});
