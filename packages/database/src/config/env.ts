/**
 * Runtime Env Accessor — Dependency Injection untuk Konfigurasi (`packages/database`)
 * ---------------------------------------------------------------------------------
 * Perluasan dari pola DI yang sama persis dengan `packages/core/src/config/env.ts`
 * (lihat dokumentasi §5 poin 10 / §10). `packages/database` SENGAJA punya modul
 * env accessor sendiri yang independen (bukan re-export dari `@free-ai-gateway/core`)
 * karena `packages/core` sudah mengimpor `@free-ai-gateway/database` langsung
 * (mis. `router/index.ts`, `auth.ts`) — kalau `database` balik mengimpor `core`
 * untuk config, itu akan jadi circular dependency antar package. Dua modul state
 * terpisah (tapi API-nya identik) adalah trade-off yang sengaja dipilih untuk
 * menghindari itu, bukan duplikasi yang tidak disadari.
 *
 * Perilaku sama seperti core:
 *   - Di Node.js (apps/gateway, Docker): tidak perlu setup apa pun, otomatis
 *     fallback ke `process.env` asli.
 *   - Di Cloudflare Worker (apps/worker): panggil `configureDatabaseEnv(env)`
 *     SEKALI di awal `fetch()` (idempotent, aman dipanggil berkali-kali),
 *     berdampingan dengan `configureCoreEnv(env)` yang sudah ada.
 *
 * Prioritas resolusi nilai: override yang di-inject > `process.env` (jika ada)
 * > undefined.
 */

export type DatabaseEnvOverrides = Record<string, string | undefined>;

let overrides: DatabaseEnvOverrides = {};

/**
 * Inject/override variabel environment untuk `packages/database`. Aman
 * dipanggil berkali-kali (merge, bukan replace) — sama seperti
 * `configureCoreEnv()` di `packages/core`.
 */
export function configureDatabaseEnv(env: DatabaseEnvOverrides): void {
  overrides = { ...overrides, ...env };
}

/** Hapus semua override — utamanya untuk isolasi antar test. */
export function resetDatabaseEnv(): void {
  overrides = {};
}

/**
 * Ambil satu nilai env. Utamakan override yang di-inject; fallback ke
 * `process.env` asli jika tersedia; `undefined` jika tidak ada di keduanya.
 */
export function getEnvVar(key: string): string | undefined {
  if (key in overrides) return overrides[key];
  if (typeof process !== "undefined" && process.env) return process.env[key];
  return undefined;
}

/** Sama seperti `getEnvVar`, tapi dengan nilai default jika tidak ditemukan. */
export function getEnvVarOrDefault(key: string, fallback: string): string {
  return getEnvVar(key) ?? fallback;
}
