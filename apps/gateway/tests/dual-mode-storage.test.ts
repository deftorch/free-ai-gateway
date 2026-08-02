import { describe, it, expect } from "bun:test";
import { db } from "@free-ai-gateway/database";
import { kv } from "@free-ai-gateway/core";

describe("Dual-Mode Storage Architecture Suite (STORAGE_MODE)", () => {
  it("harus menginstansiasi db (Drizzle ORM) dan kv (Unified KV Client) tanpa error", () => {
    expect(db).toBeDefined();
    expect(kv).toBeDefined();
    expect(kv.get).toBeDefined();
    expect(kv.set).toBeDefined();
    expect(kv.incr).toBeDefined();
    expect(kv.expire).toBeDefined();
  });

  it("kv client memory fallback harus berfungsi dengan benar untuk get, set, dan incr", async () => {
    const testKey = `test_dual_mode_${Date.now()}`;
    await kv.set(testKey, "hello_world", { ex: 60 });
    const val = await kv.get(testKey);
    expect(val).toBe("hello_world");

    const incrKey = `test_incr_${Date.now()}`;
    const n1 = await kv.incr(incrKey);
    expect(n1).toBe(1);
    const n2 = await kv.incr(incrKey);
    expect(n2).toBe(2);

    await kv.del(testKey);
    await kv.del(incrKey);
  });
});
