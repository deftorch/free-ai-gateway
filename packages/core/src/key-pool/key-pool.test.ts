import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KeyPoolManager, NoAvailableKeyError } from "./key-pool";

describe("KeyPoolManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    it("melewati key yang sedang dalam masa cooldown", () => {
      const pool = new KeyPoolManager(["key-1", "key-2", "key-3"]);
      expect(pool.selectNextKey()).toBe("key-1");
      pool.markCooldown("key-2"); // key-2 is in cooldown
      expect(pool.selectNextKey()).toBe("key-3"); // Skip key-2, go to key-3
    });

    it("menggunakan kembali key setelah cooldown berakhir", () => {
      const pool = new KeyPoolManager(["key-1", "key-2"]);
      expect(pool.selectNextKey()).toBe("key-1"); // Use key-1
      pool.markCooldown("key-1", 1000);           // key-1 gets rate limited
      expect(pool.selectNextKey()).toBe("key-2"); // Use key-2
      pool.markCooldown("key-2", 10000);          // key-2 gets rate limited
      
      // Both in cooldown, key-1 has 1000ms left, key-2 has 10000ms left
      expect(() => pool.selectNextKey()).toThrowError(NoAvailableKeyError);

      // Advance time by 1000ms
      vi.advanceTimersByTime(1000);

      // Now key-1 should be available again
      expect(pool.selectNextKey()).toBe("key-1");
    });

    it("melempar NoAvailableKeyError jika semua key dalam masa cooldown", () => {
      const pool = new KeyPoolManager(["key-1", "key-2"]);
      pool.markCooldown("key-1", 5000);
      pool.markCooldown("key-2", 10000);
      
      let error: NoAvailableKeyError | undefined;
      try {
        pool.selectNextKey();
      } catch (err) {
        error = err as NoAvailableKeyError;
      }
      
      expect(error).toBeDefined();
      expect(error?.nextAvailableAt).toBe(Date.now() + 5000);
    });
  });

  describe("constructor", () => {
    it("melempar error jika diinisialisasi dengan array kosong (fail-fast)", () => {
      expect(() => new KeyPoolManager([])).toThrowError("KeyPoolManager requires at least one key");
    });
  });
});
