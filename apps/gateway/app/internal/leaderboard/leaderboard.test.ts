import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("Internal Model Leaderboard Route Handler (/internal/leaderboard)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    const orig = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/leaderboard");

    const res = await GET(req);
    expect(res.status).toBe(401);
    process.env.INTERNAL_ADMIN_TOKEN = orig;
  });

  it("harus merespon array leaderboard jika diautentikasi dengan token valid", async () => {
    const orig = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/leaderboard", {
      headers: { Authorization: "Bearer admin-secret-test" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.leaderboard)).toBe(true);
    process.env.INTERNAL_ADMIN_TOKEN = orig;
  });
});
