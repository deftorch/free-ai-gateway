// Flat config ESLint 9. Diwarisi semua package lewat `eslint .` di masing-masing package.json.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  },
  {
    rules: {
      // Anti-mock (CLAUDE.md root aturan keras poin 1) — pelengkap scripts/anti-mock-check.sh,
      // supaya sudah kelihatan merah di editor sebelum sempat commit.
      "no-warning-comments": [
        "warn",
        { terms: ["todo", "fixme", "placeholder"], location: "anywhere" },
      ],

      // §12.6 poin 4: begitu tim menemukan agen berulang kali menyarankan API deprecated,
      // tambahkan rule di sini alih-alih mengoreksi manual tiap sesi. Contoh kerangka:
      // "no-restricted-imports": ["error", { paths: [{ name: "some-deprecated-pkg", message: "Ganti ke X, lihat docs/adr/000N" }] }],

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/_contract-tests/**"],
    rules: {
      "no-warning-comments": "off", // fixture/test boleh punya catatan TODO tanpa memicu warning
    },
  },
);
