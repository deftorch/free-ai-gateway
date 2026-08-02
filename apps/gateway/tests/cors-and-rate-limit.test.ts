import { describe, it, expect } from "bun:test";
import { proxy as middleware } from "../proxy";
import { addRateLimitHeaders } from "@free-ai-gateway/core";
import { NextRequest } from "next/server";

describe("CORS Preflight & Standard Rate-Limit Headers Suite", () => {
  it("middleware harus membalas 204 No Content untuk HTTP OPTIONS preflight request", async () => {
    const req = new NextRequest("http://localhost:3000/v1/chat/completions", {
      method: "OPTIONS",
    });

    const res = await middleware(req) as any;
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("addRateLimitHeaders harus menambahkan header rate limit standar RFC ke response", () => {
    const originalRes = new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    const res = addRateLimitHeaders(originalRes, { maxDailyRequests: 5000 } as any, 120);

    expect(res.headers.get("X-RateLimit-Limit-Requests")).toBe("5000");
    expect(res.headers.get("X-RateLimit-Remaining-Requests")).toBe("4880");
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
