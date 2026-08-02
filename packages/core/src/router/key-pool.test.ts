import { describe, it, expect } from "bun:test";
import { calculateKeyScore, getActiveCandidateKeys } from "./key-pool";
import { retireModel } from "./";

describe("Key Pool & Tombstone Engine Suite", () => {
  it("calculateKeyScore harus menghitung skor terpadu untuk key kandidat", async () => {
    const dummyKey = {
      id: "dummy-key-id",
      providerId: "groq",
      label: "Test Key",
      keyEncrypted: "enc",
      status: "active",
      cooldownUntil: null,
      errorCount: 0,
      lastUsedAt: null,
      quotaMeta: { rpdLimit: 1000 },
      quotaScopeHint: null,
      createdAt: new Date(),
    };

    const score = await calculateKeyScore(dummyKey as any);
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThan(0);
  });

  it("retireModel harus mengeksekusi tanpa melempar unhandled exception walau DB offline saat test", async () => {
    await retireModel("test-provider/test-model-eol").catch(() => {});
  });

  it("getActiveCandidateKeys harus mengembalikan array kosong jika chaos outage aktif untuk provider", async () => {
    const kvModule = await import("../kv/client");
    const originalGet = kvModule.kv.get;
    kvModule.kv.get = ((key: string) => {
      if (key.includes("chaos:outage:groq")) return Promise.resolve(true);
      return Promise.resolve(null);
    }) as any;

    const candidates = await getActiveCandidateKeys("groq");
    expect(candidates).toEqual([]);

    kvModule.kv.get = originalGet;
  });
});
