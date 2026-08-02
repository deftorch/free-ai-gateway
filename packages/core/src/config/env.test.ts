import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import {
  configureCoreEnv,
  resetCoreEnv,
  getEnvVar,
  getEnvVarOrDefault,
  getEnvVarAsNumber,
  getEnvVarAsBoolFlag,
} from "./env";

describe("config/env (DI runtime env accessor)", () => {
  afterEach(() => {
    resetCoreEnv();
  });

  test("fallback ke process.env asli jika tidak ada override (Node.js)", () => {
    process.env.__CORE_ENV_TEST_KEY__ = "from-process-env";
    expect(getEnvVar("__CORE_ENV_TEST_KEY__")).toBe("from-process-env");
    delete process.env.__CORE_ENV_TEST_KEY__;
  });

  test("override yang di-inject harus menang dibanding process.env (mis. simulasi Worker)", () => {
    process.env.__CORE_ENV_TEST_KEY__ = "from-process-env";
    configureCoreEnv({ __CORE_ENV_TEST_KEY__: "from-worker-injection" });
    expect(getEnvVar("__CORE_ENV_TEST_KEY__")).toBe("from-worker-injection");
    delete process.env.__CORE_ENV_TEST_KEY__;
  });

  test("configureCoreEnv bersifat merge (idempotent-friendly), bukan replace total", () => {
    configureCoreEnv({ A: "1" });
    configureCoreEnv({ B: "2" });
    expect(getEnvVar("A")).toBe("1");
    expect(getEnvVar("B")).toBe("2");
  });

  test("key yang tidak ada di override maupun process.env mengembalikan undefined", () => {
    expect(getEnvVar("__CORE_ENV_TOTALLY_UNSET_KEY__")).toBeUndefined();
  });

  test("getEnvVarOrDefault mengembalikan fallback jika tidak di-set", () => {
    expect(getEnvVarOrDefault("__CORE_ENV_UNSET__", "fallback-value")).toBe("fallback-value");
    configureCoreEnv({ __CORE_ENV_UNSET__: "actual-value" });
    expect(getEnvVarOrDefault("__CORE_ENV_UNSET__", "fallback-value")).toBe("actual-value");
  });

  test("getEnvVarAsNumber parse angka & fallback jika invalid/kosong", () => {
    expect(getEnvVarAsNumber("__CORE_ENV_NUM__", 60)).toBe(60);
    configureCoreEnv({ __CORE_ENV_NUM__: "120" });
    expect(getEnvVarAsNumber("__CORE_ENV_NUM__", 60)).toBe(120);
    configureCoreEnv({ __CORE_ENV_NUM__: "not-a-number" });
    expect(getEnvVarAsNumber("__CORE_ENV_NUM__", 60)).toBe(60);
  });

  test("getEnvVarAsBoolFlag mengikuti pola '!== false' (default ON)", () => {
    expect(getEnvVarAsBoolFlag("__CORE_ENV_FLAG__")).toBe(true);
    configureCoreEnv({ __CORE_ENV_FLAG__: "false" });
    expect(getEnvVarAsBoolFlag("__CORE_ENV_FLAG__")).toBe(false);
    configureCoreEnv({ __CORE_ENV_FLAG__: "anything-else" });
    expect(getEnvVarAsBoolFlag("__CORE_ENV_FLAG__")).toBe(true);
  });

  test("resetCoreEnv menghapus semua override (utamanya untuk isolasi antar test)", () => {
    configureCoreEnv({ X: "y" });
    expect(getEnvVar("X")).toBe("y");
    resetCoreEnv();
    expect(getEnvVar("X")).toBeUndefined();
  });
});
