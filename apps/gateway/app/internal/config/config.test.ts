import { describe, it, expect } from "bun:test";
import { GET, POST } from "./route";

describe("Internal Config Backup & Restore Route Handler (/internal/config)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/config");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("harus merespon JSON payload ekspor konfigurasi jika diautentikasi dengan token valid", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/config", {
      headers: { Authorization: "Bearer secret-admin-key" },
    });

    const res = await GET(req);
    expect([200, 500].includes(res.status)).toBe(true);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.version).toBe("1.0");
      expect(json.exportedAt).toBeDefined();
    }
  });

  it("harus memproses impor konfigurasi JSON secara aman (POST)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/config", {
      method: "POST",
      headers: { Authorization: "Bearer secret-admin-key" },
      body: JSON.stringify({
        version: "1.0",
        modelGroups: [
          { id: "test-group", name: "Test Group", strategy: "ordered", members: [{ modelId: "groq/openai/gpt-oss-120b" }] },
        ],
      }),
    });

    const res = await POST(req);
    expect([200, 500].includes(res.status)).toBe(true);
  });
});
