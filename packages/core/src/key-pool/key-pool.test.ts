import { describe, it, expect } from "vitest";
import { KeyPoolManager } from "./key-pool";

describe("KeyPoolManager", () => {
  describe("selectNextKey", () => {
    it("berpindah ke key kedua setelah key pertama dipakai", () => {
      const pool = new KeyPoolManager(["key-a", "key-b", "key-c"]);

      const first = pool.selectNextKey();
      const second = pool.selectNextKey();

      expect(first).toBe("key-a");
      expect(second).toBe("key-b");
    });

    it("wraparound: kembali ke key pertama setelah mencapai akhir", () => {
      const pool = new KeyPoolManager(["key-1", "key-2"]);

      expect(pool.selectNextKey()).toBe("key-1");
      expect(pool.selectNextKey()).toBe("key-2");
      // Wraparound
      expect(pool.selectNextKey()).toBe("key-1");
      expect(pool.selectNextKey()).toBe("key-2");
    });
  });

  describe("constructor", () => {
    it("melempar error jika diinisialisasi dengan array kosong (fail-fast)", () => {
      expect(() => new KeyPoolManager([])).toThrowError("KeyPoolManager requires at least one key");
    });
  });
});
