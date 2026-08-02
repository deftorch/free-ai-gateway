import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("Internal System Health Metrics Route Handler (/internal/health)", () => {
  it("GET /internal/health harus menolak request tanpa Admin Auth Token (401 Unauthorized)", async () => {
    const req = new Request("http://localhost:3000/internal/health", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("GET /internal/health harus merespon data keys & recentMetrics jika diautentikasi dengan benar", async () => {
    const originalToken = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-health-test";

    const req = new Request("http://localhost:3000/internal/health", {
      method: "GET",
      headers: { Authorization: "Bearer admin-secret-health-test" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.keys)).toBe(true);
    expect(Array.isArray(json.recentMetrics)).toBe(true);

    process.env.INTERNAL_ADMIN_TOKEN = originalToken;
  });
});
