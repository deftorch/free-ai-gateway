import { describe, it, expect } from "bun:test";
import { verifyInternalAdminToken, verifyCronSecret, verifyGatewayTokenDetailed } from "./auth";

describe("Auth Utilities", () => {
  it("verifyInternalAdminToken harus menerima token yang valid dan menolak yang invalid", () => {
    const orig = process.env.INTERNAL_ADMIN_TOKEN;
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-123";

    expect(verifyInternalAdminToken("Bearer secret-admin-123")).toBe(true);
    expect(verifyInternalAdminToken("Bearer wrong-token")).toBe(false);
    expect(verifyInternalAdminToken("NotABearer token")).toBe(false);
    expect(verifyInternalAdminToken(null)).toBe(false);

    process.env.INTERNAL_ADMIN_TOKEN = orig;
  });

  it("verifyCronSecret harus menerima secret yang valid dan menolak yang invalid", () => {
    process.env.CRON_SECRET = "secret-cron-456";

    expect(verifyCronSecret("Bearer secret-cron-456")).toBe(true);
    expect(verifyCronSecret("Bearer wrong-secret")).toBe(false);
    expect(verifyCronSecret("InvalidHeader")).toBe(false);
    expect(verifyCronSecret(null)).toBe(false);
  });

  describe("verifyGatewayTokenDetailed Permission & Budget Cap", () => {
    it("harus menolak header authorization yang tidak valid", async () => {
      const res1 = await verifyGatewayTokenDetailed(null);
      expect(res1.valid).toBe(false);
      if (!res1.valid) expect(res1.statusCode).toBe(401);

      const res2 = await verifyGatewayTokenDetailed("InvalidPrefix xyz");
      expect(res2.valid).toBe(false);
    });
  });
});
