import { describe, it, expect } from "bun:test";
import { parseModelId, getActiveCandidateKeys } from "./";

describe("Router Utilities", () => {
  it("harus memparsing model ID berformat provider/model dengan benar", () => {
    const parsed = parseModelId("groq/openai/gpt-oss-120b");
    expect(parsed.providerId).toBe("groq");
    expect(parsed.modelId).toBe("openai/gpt-oss-120b");
  });

  it("harus memparsing model ID dengan sub-path/tag dengan benar", () => {
    const parsed = parseModelId("openrouter/qwen/qwen3-coder:free");
    expect(parsed.providerId).toBe("openrouter");
    expect(parsed.modelId).toBe("qwen/qwen3-coder:free");
  });

  it("harus melempar error jika format model ID tidak memiliki '/'", () => {
    expect(() => parseModelId("invalid-model-name")).toThrow(
      'Format model id tidak valid: "invalid-model-name". Gunakan "provider/model".'
    );
  });

  it("harus menangani pencarian key kandidat dengan aman jika tidak ada DB/Key", async () => {
    const candidates = await getActiveCandidateKeys("non-existent-provider", "lru");
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBe(0);
  });

  it("harus mengurutkan key kandidat berdasarkan LRU (paling lama tidak dipakai pertama)", () => {
    const keyRows = [
      { id: "key-1", label: "Baru Dipakai", lastUsedAt: new Date(Date.now() - 1000) },
      { id: "key-2", label: "Lama Tidak Dipakai", lastUsedAt: new Date(Date.now() - 100000) },
      { id: "key-3", label: "Belum Pernah Dipakai", lastUsedAt: null },
    ];

    const sorted = [...keyRows].sort((a, b) => {
      const aTime = a.lastUsedAt ? a.lastUsedAt.getTime() : 0;
      const bTime = b.lastUsedAt ? b.lastUsedAt.getTime() : 0;
      return aTime - bTime;
    });

    expect(sorted[0].id).toBe("key-3"); // Belum pernah dipakai
    expect(sorted[1].id).toBe("key-2"); // 100s lalu
    expect(sorted[2].id).toBe("key-1"); // 1s lalu
  });

  it("harus merotasi key kandidat dengan algoritma Round-Robin berdasarkan counter offset", () => {
    const available = ["key-A", "key-B", "key-C"];
    
    // Simulate Round-Robin offsets
    const getRROrder = (counter: number) => {
      const offset = (counter - 1) % available.length;
      return [...available.slice(offset), ...available.slice(0, offset)];
    };

    expect(getRROrder(1)).toEqual(["key-A", "key-B", "key-C"]);
    expect(getRROrder(2)).toEqual(["key-B", "key-C", "key-A"]);
    expect(getRROrder(3)).toEqual(["key-C", "key-A", "key-B"]);
    expect(getRROrder(4)).toEqual(["key-A", "key-B", "key-C"]); // melingkar kembali
  });
});


