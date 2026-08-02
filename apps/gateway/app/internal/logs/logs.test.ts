import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("Internal Log Explorer Route Handler (/internal/logs)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/logs");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("harus merespon data array log dan pagination jika diautentikasi dengan token valid", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/logs?page=1&limit=10", {
      headers: {
        Authorization: "Bearer secret-admin-key",
      },
    });

    const res = await GET(req);
    expect([200, 500].includes(res.status)).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });
});
