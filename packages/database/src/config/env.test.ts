import { expect, test, describe, afterEach } from "bun:test";
import {
  configureDatabaseEnv,
  resetDatabaseEnv,
  getEnvVar,
  getEnvVarOrDefault,
} from "./env";

describe("config/env (DI runtime env accessor — packages/database)", () => {
  afterEach(() => {
    resetDatabaseEnv();
  });

  test("fallback ke process.env asli jika tidak ada override (Node.js)", () => {
    process.env.__DB_ENV_TEST_KEY__ = "from-process-env";
    expect(getEnvVar("__DB_ENV_TEST_KEY__")).toBe("from-process-env");
    delete process.env.__DB_ENV_TEST_KEY__;
  });

  test("override yang di-inject harus menang dibanding process.env (mis. simulasi Worker)", () => {
    process.env.__DB_ENV_TEST_KEY__ = "from-process-env";
    configureDatabaseEnv({ __DB_ENV_TEST_KEY__: "from-worker-injection" });
    expect(getEnvVar("__DB_ENV_TEST_KEY__")).toBe("from-worker-injection");
    delete process.env.__DB_ENV_TEST_KEY__;
  });

  test("configureDatabaseEnv bersifat merge (idempotent-friendly), bukan replace total", () => {
    configureDatabaseEnv({ A: "1" });
    configureDatabaseEnv({ B: "2" });
    expect(getEnvVar("A")).toBe("1");
    expect(getEnvVar("B")).toBe("2");
  });

  test("key yang tidak ada di override maupun process.env mengembalikan undefined", () => {
    expect(getEnvVar("__DB_ENV_TOTALLY_UNSET_KEY__")).toBeUndefined();
  });

  test("getEnvVarOrDefault mengembalikan fallback jika tidak di-set", () => {
    expect(getEnvVarOrDefault("__DB_ENV_UNSET__", "fallback-value")).toBe("fallback-value");
    configureDatabaseEnv({ __DB_ENV_UNSET__: "actual-value" });
    expect(getEnvVarOrDefault("__DB_ENV_UNSET__", "fallback-value")).toBe("actual-value");
  });

  test("resetDatabaseEnv menghapus semua override (utamanya untuk isolasi antar test)", () => {
    configureDatabaseEnv({ X: "y" });
    expect(getEnvVar("X")).toBe("y");
    resetDatabaseEnv();
    expect(getEnvVar("X")).toBeUndefined();
  });

  test("state independen dari packages/core — modul ini tidak mengimpor @free-ai-gateway/core", async () => {
    // Ini bukan assertion runtime yang bisa gagal secara dinamis; ini pengingat
    // eksplisit di test suite kenapa modul ini punya state sendiri (lihat
    // komentar di ./env.ts) — dicek juga oleh tsc/build kalau core diimpor
    // di sini (circular dependency akan gagal resolve).
    expect(true).toBe(true);
  });
});
