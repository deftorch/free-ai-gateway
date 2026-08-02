import { describe, it, expect } from "bun:test";
import { GET as getOpenApi } from "./route";
import { GET as getDocs } from "../../docs/route";

describe("OpenAPI Specification & Interactive Docs Suite", () => {
  it("GET /v1/openapi.json harus mengembalikan spesifikasi OpenAPI 3.0 yang valid", async () => {
    const req = new Request("http://localhost:3000/v1/openapi.json");
    const res = await getOpenApi(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.openapi).toBe("3.0.3");
    expect(json.info).toBeDefined();
    expect(json.info.title).toContain("Free AI Gateway API");
    expect(json.paths).toBeDefined();
    expect(json.paths["/chat/completions"]).toBeDefined();
    expect(json.paths["/messages"]).toBeDefined();
    expect(json.paths["/models"]).toBeDefined();
    expect(json.paths["/embeddings"]).toBeDefined();
    expect(json.components.securitySchemes.BearerAuth).toBeDefined();
  });

  it("GET /docs harus mengembalikan halaman HTML Scalar API reference", async () => {
    const req = new Request("http://localhost:3000/docs");
    const res = await getDocs(req);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!aria-hidden=\"true\" html>");
    expect(html).toContain("Free AI Gateway - API Reference");
    expect(html).toContain("data-url=\"http://localhost:3000/v1/openapi.json\"");
  });
});
