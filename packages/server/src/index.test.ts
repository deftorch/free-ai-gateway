import { describe, it, expect, beforeEach, afterEach } from "vitest";
import app from "./index";
import { db, virtualKeys, tenants } from "@free-ai-gateway/core";
import { createHash } from "crypto";

describe("POST /v1/chat/completions Authorization Scopes", () => {
  const rawKey = "fag_sk_scopetest123";
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  beforeEach(async () => {
    // Clear DB
    await db.delete(virtualKeys);
    await db.delete(tenants);

    // Setup DB: tenant and a key with scope ONLY for gemini
    await db.insert(tenants).values({ id: "scope-tenant", name: "Scope Test", createdAt: new Date().toISOString() });
    await db.insert(virtualKeys).values({
      id: "vk_scope",
      tenantId: "scope-tenant",
      keyHash,
      keyPrefix: "fag_sk_scop",
      scopes: ["gemini"],
      createdAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    await db.delete(virtualKeys);
    await db.delete(tenants);
  });

  it("menolak akses jika provider tidak ada dalam scope (403)", async () => {
    const req = new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "nvidia-nim", // key only has "gemini"
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: "hello" }],
      }),
    });

    const res = await app.request(req);
    expect(res.status).toBe(403);
    
    const body = await res.json();
    expect(body.error.type).toBe("insufficient_scope");
  });
});
