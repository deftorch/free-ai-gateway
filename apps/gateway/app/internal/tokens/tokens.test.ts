import { describe, it, expect } from "bun:test";
import { generateGatewayToken, hashGatewayToken } from "@free-ai-gateway/core";

describe("Internal Gateway Token Creation", () => {
  it("harus membuat token unik dengan panjang yang sesuai", async () => {
    const { rawToken, tokenHash } = await generateGatewayToken();
    expect(rawToken).toMatch(/^gw_[0-9a-f]{48}$/);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toBe(await hashGatewayToken(rawToken));
  });

  it("harus membuat token yang berbeda setiap kali dipanggil", async () => {
    const token1 = await generateGatewayToken();
    const token2 = await generateGatewayToken();
    expect(token1.rawToken).not.toBe(token2.rawToken);
    expect(token1.tokenHash).not.toBe(token2.tokenHash);
  });
});
