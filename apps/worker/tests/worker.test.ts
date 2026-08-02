import { describe, it, expect, spyOn, afterAll, beforeAll } from "bun:test";
import worker, { type Env } from "../src/index";
import * as core from "@free-ai-gateway/core";
import * as db from "@free-ai-gateway/database";

describe("Cloudflare Worker Entry Point", () => {
  const dummyEnv: Env = {
    UPSTASH_REDIS_REST_URL: "https://example.com",
    UPSTASH_REDIS_REST_TOKEN: "token123",
    DATABASE_URL: "postgres://dummy",
  };

  const dummyCtx: any = {
    waitUntil: () => {},
    passThroughOnException: () => {}
  };

  beforeAll(() => {
    spyOn(core, "verifyGatewayTokenDetailed").mockImplementation(async (authHeader: string) => {
      if (authHeader === "Bearer valid-token") {
        return { valid: true, payload: { id: "test-user" }, tier: "free", status: "active", statusCode: 200 } as any;
      }
      return { valid: false, error: "Invalid token", statusCode: 401 };
    });

    spyOn(core, "processChatRequest").mockImplementation(async () => {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      return { statusCode: 200, body: JSON.stringify({ id: "chat-123" }), headers } as any;
    });

    spyOn(core, "configureCoreEnv").mockImplementation(() => {});
    spyOn(core, "analyzeNetworkWAF").mockImplementation(async () => {
      return { allowed: true } as any;
    });
    spyOn(db, "configureDatabaseEnv").mockImplementation(() => {});
  });

  afterAll(() => {
    import("bun:test").then(({ mock }) => {
      mock.restore();
    });
  });

  it("should handle OPTIONS preflight request (CORS)", async () => {
    const req = new Request("http://localhost/v1/chat/completions", { method: "OPTIONS" });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });

  it("should return 200 on /health endpoint", async () => {
    const req = new Request("http://localhost/health", { method: "GET" });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("edge-active");
  });

  it("should return 404 for unknown endpoints", async () => {
    const req = new Request("http://localhost/unknown", { method: "GET" });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });

  it("should reject /v1/chat/completions without auth header", async () => {
    const req = new Request("http://localhost/v1/chat/completions", { method: "POST" });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("should reject /v1/chat/completions with invalid token", async () => {
    const req = new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer invalid-token" },
    });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe("Invalid token");
  });

  it("should process /v1/chat/completions with valid token", async () => {
    const req = new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer valid-token" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", messages: [] })
    });
    const res = await worker.fetch(req, dummyEnv, dummyCtx);
    
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe("chat-123");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
