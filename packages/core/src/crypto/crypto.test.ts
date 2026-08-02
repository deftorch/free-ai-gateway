import { describe, it, expect } from "bun:test";
import { encryptApiKey, decryptApiKey, hashGatewayToken } from "./";

/**
 * Unit test pertama untuk modul keamanan enkripsi (lib/crypto).
 * Sesuai instruksi CLAUDE.md: "kalau menambah logic penting (terutama lib/router
 * dan lib/crypto), tambahkan unit test dan sebutkan di ringkasan pekerjaan
 * bahwa test suite baru pertama kali dibuat."
 */
describe("Lib Crypto & Auth Utilities", () => {
  it("harus mengenkripsi dan mendekripsi API key dengan benar (AES-GCM)", async () => {
    // Pastikan env var key enkripsi tes tersedia untuk test ini
    if (!process.env.KEY_ENCRYPTION_SECRET) {
      // 32 bytes base64-encoded dummy secret untuk testing (dari "12345678901234567890123456789012")
      process.env.KEY_ENCRYPTION_SECRET = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";
    }

    const originalKey = "sk-ant-test-secret-key-123456789";
    const ciphertext = await encryptApiKey(originalKey);

    expect(ciphertext).not.toBe(originalKey);

    const decrypted = await decryptApiKey(ciphertext);
    expect(decrypted).toBe(originalKey);
  });

  it("harus menghasilkan SHA-256 hash yang konsisten untuk gateway token", async () => {
    const token = "gw_live_abc123xyz";
    const hash1 = await hashGatewayToken(token);
    const hash2 = await hashGatewayToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });
});
