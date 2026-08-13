import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Belum ada test unit untuk adapter ini (contract test yang jadi DoD
    // utama, lihat adapters/_contract-tests/) -- tanpa ini, vitest exit 1
    // saat tidak menemukan file test sama sekali.
    passWithNoTests: true,
  },
});
