/**
 * Runtime Env Accessor — Dependency Injection untuk Konfigurasi
 * ---------------------------------------------------------------
 * `packages/core` adalah TypeScript murni yang dipakai ulang oleh 3 target
 * runtime berbeda (Next.js/Node, Docker/Node, Cloudflare Worker/edge). Node.js
 * menyediakan config lewat `process.env` global; Cloudflare Workers hanya
 * menyediakan config lewat parameter `env` per-request/per-isolate — tidak
 * ada `process.env` bawaan sama sekali.
 *
 * Modul ini menggantikan pola lama "mutasi `globalThis.process` di worker
 * agar pura-pura ada `process.env`" dengan dependency injection eksplisit:
 *
 *   - Di Node.js (apps/gateway, Docker): tidak perlu setup apa pun. Modul ini
 *     otomatis fallback ke `process.env` asli — perilaku lama tetap jalan.
 *   - Di Cloudflare Worker (apps/worker): panggil `configureCoreEnv(env)` SEKALI
 *     di awal `fetch()` (idempotent, aman dipanggil berkali-kali) sebelum
 *     memanggil fungsi core apa pun. Tidak ada lagi mutasi `globalThis`.
 *
 * Prioritas resolusi nilai: override yang di-inject > `process.env` (jika ada,
 * mis. di Node.js) > undefined.
 *
 * CATATAN CAKUPAN: ini DI berbasis modul-level state (bukan per-request
 * AsyncLocalStorage). Ini cukup untuk kasus Worker saat ini karena binding
 * Cloudflare identik untuk setiap request pada satu deployment (lihat
 * catatan lama di apps/worker/src/index.ts). Kalau nanti dibutuhkan config
 * yang benar-benar berbeda per-request/per-tenant dalam satu isolate yang
 * sama, override ini perlu diganti pola per-request (mis. lewat
 * `AsyncLocalStorage` atau meneruskan `env` eksplisit ke setiap fungsi core),
 * bukan modul-level state seperti sekarang.
 */

export type CoreEnvOverrides = Record<string, string | undefined>;

let overrides: CoreEnvOverrides = {};

/**
 * Inject/override variabel environment untuk `packages/core`. Aman dipanggil
 * berkali-kali (merge, bukan replace) — sengaja idempotent-friendly agar
 * caller (mis. Worker `fetch()` handler) tidak perlu melacak "sudah pernah
 * dipanggil atau belum" secara manual seperti pola lama.
 */
export function configureCoreEnv(env: CoreEnvOverrides): void {
  overrides = { ...overrides, ...env };
}

/** Hapus semua override — utamanya untuk isolasi antar test. */
export function resetCoreEnv(): void {
  overrides = {};
}

/**
 * Ambil satu nilai env. Utamakan override yang di-inject; fallback ke
 * `process.env` asli jika tersedia (mis. di runtime Node.js); `undefined`
 * jika tidak ada di keduanya (mis. di Worker sebelum `configureCoreEnv`
 * dipanggil, atau key memang tidak pernah di-set).
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

/** Helper untuk env var numerik (mis. rate limit), dengan fallback numerik. */
export function getEnvVarAsNumber(key: string, fallback: number): number {
  const raw = getEnvVar(key);
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Helper untuk env var boolean gaya "!== 'false'" (dipakai feature flags). */
export function getEnvVarAsBoolFlag(key: string, defaultOn = true): boolean {
  const raw = getEnvVar(key);
  if (raw === undefined) return defaultOn;
  return raw !== "false";
}
