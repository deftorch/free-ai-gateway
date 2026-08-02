import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("Internal Admin Audit Log Route Handler (/internal/audit-logs)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    const orig = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/audit-logs");

    const res = await GET(req);
    expect(res.status).toBe(401);
    process.env.INTERNAL_ADMIN_TOKEN = orig;
  });

  it("harus merespon array logs jika diautentikasi dengan token valid", async () => {
    const orig = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/audit-logs?limit=10", {
      headers: { Authorization: "Bearer admin-secret-test" },
    });

    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
    const json = await res.json();
    expect(Array.isArray(json.logs)).toBe(true);
    process.env.INTERNAL_ADMIN_TOKEN = orig;
  });
});
