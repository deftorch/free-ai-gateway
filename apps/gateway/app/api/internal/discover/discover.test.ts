import { describe, it, expect } from "bun:test";
import { POST } from "./route";

describe("POST /api/internal/discover", () => {
  it("harus menolak jika baseUrl tidak diisi", async () => {
    const req = new Request("http://localhost/api/internal/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.type).toBe("invalid_input");
  });

  it("harus merespon error jika gagal terhubung ke endpoint kustom", async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = ((..._args: Parameters<typeof fetch>) =>
        Promise.reject(new Error("Connection refused"))) as typeof fetch;

    const req = new Request("http://localhost/api/internal/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: "http://localhost:59999/v1", // Port tak terjangkau
        label: "Unreachable Node",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);

      const json = await res.json();
      expect(json.error.type).toBe("discovery_connection_failed");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
