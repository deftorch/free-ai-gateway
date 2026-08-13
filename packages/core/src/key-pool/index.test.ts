import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getProviderPool, initializeAllPools, clearPools, recordCooldown } from "./index";
import { keyCooldowns } from "../db/schema";
import { db as dbInstance } from "../db/index";
import { createHash } from "crypto";

describe("Provider Key Registry", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearPools();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getProviderPool", () => {
    it("memetakan id 'nvidia-nim' ke env var NVIDIA_API_KEYS", () => {
      process.env.NVIDIA_API_KEYS = "nvidia-1, nvidia-2";
      const pool = getProviderPool("nvidia-nim");
      expect(pool.selectNextKey()).toBe("nvidia-1");
      expect(pool.selectNextKey()).toBe("nvidia-2");
    });

    it("memetakan id 'gemini' ke env var GEMINI_API_KEYS", () => {
      process.env.GEMINI_API_KEYS = "gemini-test";
      const pool = getProviderPool("gemini");
      expect(pool.selectNextKey()).toBe("gemini-test");
    });

    it("melempar error jika provider tidak terdaftar", () => {
      expect(() => getProviderPool("unknown-provider")).toThrowError("tidak terdaftar di registry env var");
    });
  });

  describe("initializeAllPools", () => {
    it("melempar error saat startup jika ada env var yang kosong", async () => {
      process.env.GEMINI_API_KEYS = "gemini-1";
      process.env.NVIDIA_API_KEYS = ""; // Kosong, harusnya error
      
      await expect(initializeAllPools()).rejects.toThrowError("NVIDIA_API_KEYS belum diset di .env");
    });
  });
});



describe("Cooldown Persistence", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    clearPools();
    await dbInstance.delete(keyCooldowns);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await dbInstance.delete(keyCooldowns);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("recordCooldown menulis hash key ke DB, bukan raw key", async () => {
    process.env.GEMINI_API_KEYS = "secret-key-1, secret-key-2";
    
    await recordCooldown("gemini", "secret-key-1", 10000);
    
    const rows = await dbInstance.select().from(keyCooldowns);
    expect(rows.length).toBe(1);
    
    // Pastikan key mentah tidak ada
    expect(rows[0].keyHash).not.toBe("secret-key-1");
    expect(rows[0].keyHash).toBe(createHash("sha256").update("secret-key-1").digest("hex"));
  });

  it("recordCooldown dipanggil dua kali melakukan upsert, bukan duplikasi", async () => {
    process.env.GEMINI_API_KEYS = "secret-key-1, secret-key-2";
    
    await recordCooldown("gemini", "secret-key-1", 10000);
    const rows1 = await dbInstance.select().from(keyCooldowns);
    expect(rows1.length).toBe(1);
    const firstUpdate = rows1[0].cooldownUntil;
    
    vi.advanceTimersByTime(5000);
    
    await recordCooldown("gemini", "secret-key-1", 20000);
    const rows2 = await dbInstance.select().from(keyCooldowns);
    expect(rows2.length).toBe(1);
    expect(rows2[0].cooldownUntil).toBeGreaterThan(firstUpdate);
  });

  it("initializeAllPools mengembalikan state cooldown dari DB saat server restart", async () => {
    process.env.GEMINI_API_KEYS = "secret-key-1, secret-key-2";
    process.env.NVIDIA_API_KEYS = "nvidia-1";
    
    // Simulate previous run saving a cooldown
    await recordCooldown("gemini", "secret-key-1", 30000);
    
    // "Restart server": hapus in-memory state
    clearPools();
    
    // Initialize ulang
    await initializeAllPools();
    
    const pool = getProviderPool("gemini");
    // secret-key-1 harus di-skip karena masih cooldown
    const firstKey = pool.selectNextKey();
    expect(firstKey).toBe("secret-key-2");
    
    // Dipanggil lagi, karena secret-key-1 masih cooldown, akan memberikan secret-key-2 lagi
    const secondKey = pool.selectNextKey();
    expect(secondKey).toBe("secret-key-2");
  });
});
