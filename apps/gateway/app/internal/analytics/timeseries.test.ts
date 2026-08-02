import { describe, it, expect } from "bun:test";
import { GET } from "./timeseries/route";

describe("Internal TimeSeries Analytics Route Handler (/internal/analytics/timeseries)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/analytics/timeseries");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("harus merespon array points analytics jika diautentikasi dengan token valid", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "admin-secret-test";
    const req = new Request("http://localhost/internal/analytics/timeseries", {
      headers: { Authorization: "Bearer admin-secret-test" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.points)).toBe(true);
  });
});
