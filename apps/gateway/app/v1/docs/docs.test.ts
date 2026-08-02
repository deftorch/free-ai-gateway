import { describe, it, expect } from "bun:test";
import { GET as getOpenApi } from "../openapi.json/route";
import { GET as getDocs } from "./route";

describe("API Documentation Routes (/v1/docs & /v1/openapi.json)", () => {
  it("GET /v1/openapi.json harus mengembalikan spesifikasi OpenAPI JSON yang valid", async () => {
    const res = await getOpenApi(new Request("http://localhost:3000/v1/openapi.json"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.openapi).toBe("3.0.3");
    expect(json.info.title).toContain("Free AI Gateway");
    expect(json.paths["/v1/chat/completions"]).toBeDefined();
  });

  it("GET /v1/docs harus mengembalikan halaman HTML Swagger UI", async () => {
    const res = await getDocs();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("swagger-ui");
  });
});
