import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Belum ada test unit di package ini -- tanpa ini, vitest exit 1 saat
    // tidak menemukan file test sama sekali (lihat CLAUDE.md untuk area mana
    // yang TDD-wajib vs opsional).
    passWithNoTests: true,
  },
});
