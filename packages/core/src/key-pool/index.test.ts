import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getProviderPool, initializeAllPools, clearPools } from "./index";

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
    it("melempar error saat startup jika ada env var yang kosong", () => {
      process.env.GEMINI_API_KEYS = "gemini-1";
      process.env.NVIDIA_API_KEYS = ""; // Kosong, harusnya error
      
      expect(() => initializeAllPools()).toThrowError("NVIDIA_API_KEYS belum diset di .env");
    });
  });
});
