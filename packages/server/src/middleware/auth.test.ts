import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { requireAuth } from "./auth";
import { db, virtualKeys, tenants } from "@free-ai-gateway/core";
import { createHash } from "crypto";

describe("Auth Middleware", () => {
  let app: Hono<{ Variables: { tenantId: string; scopes: unknown } }>;

  beforeEach(async () => {
    // Clear DB
    await db.delete(virtualKeys);
    await db.delete(tenants);

    app = new Hono<{ Variables: { tenantId: string; scopes: unknown } }>();
    app.use("*", requireAuth);
    app.get("/test", (c) => c.json({ tenantId: c.get("tenantId") }));
  });

  afterEach(async () => {
    await db.delete(virtualKeys);
    await db.delete(tenants);
  });

  it("menolak request tanpa Authorization header", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });

  it("ADR 0004: X-Tenant-Id header wajib diabaikan dan tenant_id diambil murni dari lookup virtual key", async () => {
    const rawKey = "fag_sk_test123456789";
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    // Setup DB
    await db.insert(tenants).values({ id: "real-tenant", name: "Real", createdAt: new Date().toISOString() });
    await db.insert(virtualKeys).values({
      id: "vk_1",
      tenantId: "real-tenant",
      keyHash,
      keyPrefix: "fag_sk_t",
      scopes: ["gemini"],
      createdAt: new Date().toISOString(),
    });

    const req = new Request("http://localhost/test", {
      headers: {
        "Authorization": `Bearer ${rawKey}`,
        "X-Tenant-Id": "fake-tenant-attack",
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    // Invariant krusial: tidak boleh "fake-tenant-attack"
    expect(body.tenantId).toBe("real-tenant");
  });
});
