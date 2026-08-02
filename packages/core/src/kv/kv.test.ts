import { describe, it, expect } from "bun:test";
import { getTodayUTCDateString, getSecondsUntilUTCMidnight, kvKeys } from "./client";

describe("KV Utilities Suite", () => {
  it("getTodayUTCDateString harus mengembalikan format YYYY-MM-DD", () => {
    const today = getTodayUTCDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getSecondsUntilUTCMidnight harus mengembalikan sisa detik positif hingga 00:00 UTC", () => {
    const seconds = getSecondsUntilUTCMidnight();
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(86400); // Maksimal 24 jam (86400 detik)
  });

  it("kvKeys harus membuat Redis key dengan nama yang benar untuk RPD, TPD, Cooldown, dan Backoff", () => {
    const apiKeyId = "key-test-123";
    const dateStr = "2026-07-30";

    expect(kvKeys.rpdCount(apiKeyId, dateStr)).toBe("rpd:key-test-123:2026-07-30");
    expect(kvKeys.backoffLevel(apiKeyId)).toBe("backoff:key-test-123");
    expect(kvKeys.tpdCount(apiKeyId, dateStr)).toBe("tpd:key-test-123:2026-07-30");
    expect(kvKeys.cooldown(apiKeyId)).toBe("cooldown:key-test-123");
    expect(kvKeys.errorStreak(apiKeyId)).toBe("errstreak:key-test-123");
    expect(kvKeys.lastUsed(apiKeyId)).toBe("lastused:key-test-123");
  });
});
