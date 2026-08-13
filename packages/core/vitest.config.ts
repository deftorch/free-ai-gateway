import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Belum ada logika Step 3+ (key-pool, dst) yang butuh TDD ketat -- sampai
    // itu ditulis, tidak ada file test di sini. Tanpa ini, vitest exit 1.
    passWithNoTests: true,
    coverage: {
      // Coverage tinggi untuk area TDD-ketat (§12.2), bukan ditegakkan global —
      // logika murni (key-pool, auth) yang paling penting dijaga di sini.
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
