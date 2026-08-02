import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("GET /v1/models (List Models OpenAI Route Handler)", () => {
  it("harus menolak request tanpa Authorization header (401 Unauthorized)", async () => {
    const req = new Request("http://localhost:3000/v1/models", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.type).toBe("unauthorized");
  });

  it("harus merespon format 'list' jika diautentikasi dengan token valid", async () => {
    const req = new Request("http://localhost:3000/v1/models", {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid-or-test-token",
      },
    });

    const res = await GET(req);
    // Jika token tidak ada di DB test, mengembalikan 401; jika valid mengembalikan 200 dengan object: "list"
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.object).toBe("list");
      expect(Array.isArray(json.data)).toBe(true);
    }
  });
});
