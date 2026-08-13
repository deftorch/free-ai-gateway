# Task Brief — Step 4: Deteksi 429 + Cooldown (in-memory)

> Status referensi: hasil diskusi desain sebelum implementasi. Ikuti alur TDD
> Red-Green-Refactor seperti `docs/tdd-example-key-rotation.md`. Jangan
> mengerjakan item di luar "Scope" — catat sebagai komentar `// SENGAJA belum
> ada: ...` mengikuti konvensi yang sudah dipakai di `packages/server/src/index.ts`.

## Scope (WAJIB dikerjakan)

1. **Extend `KeyPoolManager`** (`packages/core/src/key-pool/key-pool.ts`)
   - Tambah state internal: `Map<string, number>` — key → timestamp (ms epoch)
     kapan cooldown key tersebut berakhir.
   - Tambah method `markCooldown(key: string, durationMs?: number): void`.
     - Kalau `durationMs` tidak diberikan, pakai default fixed **30000 ms**
       (konstanta bernama, mis. `DEFAULT_COOLDOWN_MS`, jangan angka ajaib).
   - Ubah `selectNextKey()`:
     - Lewati key yang `cooldownUntil > Date.now()`.
     - Kalau **semua** key dalam pool sedang cooldown, `throw` error baru
       (lihat poin 3) — jangan kembalikan key yang masih berisiko limit.
   - Cooldown dicek murni berbasis waktu (pasif) — TIDAK ada background
     job/interval yang aktif mengetes key.

2. **Isi `retryAfterMs` di kedua adapter** (`adapters/gemini/src/adapter.ts`,
   `adapters/nvidia-nim/src/adapter.ts`)
   - Saat throw `ProviderError(message, "rate_limited")`, parse header
     `Retry-After` dari response HTTP asli (kalau ada) dan isi sebagai
     argumen ketiga (dalam ms).
   - Kalau header tidak ada / tidak valid, biarkan `retryAfterMs` undefined
     (server yang akan fallback ke default cooldown).
   - **Perlu fixture baru** di `adapters/_contract-tests/fixtures/` yang
     merekam response 429 asli dengan header `Retry-After` — JANGAN
     mengarang bentuk header dari memori (lihat `adapters/CLAUDE.md`).

3. **Error baru untuk "semua key habis"**
   - Definisikan di `packages/core` (lokasi persis didiskusikan saat
     implementasi — bisa reuse `ProviderError` dengan `kind` baru, atau
     kelas terpisah `NoAvailableKeyError`).
   - Server (`packages/server/src/index.ts`) menangkap ini dan mengembalikan
     response terstruktur (bukan 500 generik): status yang sesuai (429),
     provider mana yang habis, dan `next_available_at` (waktu cooldown
     tercepat berakhir di antara semua key provider itu).

4. **Wiring di `packages/server/src/index.ts`**
   - Di blok `catch` yang sudah menangani `ProviderError`, tambah cabang:
     `kind === "rate_limited"` → panggil `pool.markCooldown(apiKey, err.retryAfterMs)`
     sebelum meneruskan/translate response error ke klien.
   - Pastikan pool instance yang dipakai di sini adalah instance yang sama
     dari `getProviderPool()`/`initializeAllPools()` (Step 3) — bukan
     instance baru.

5. **Test wajib** (fake timers, `vi.useFakeTimers()` sejak awal — jangan
   pakai `sleep()` asli)
   - `key-pool.test.ts`:
     - Key yang di-`markCooldown()` dilewati oleh `selectNextKey()`.
     - Setelah waktu (simulasi) melebihi durasi cooldown, key otomatis
       tersedia lagi tanpa perlu action tambahan.
     - Semua key dalam pool cooldown → `selectNextKey()` throw error yang
       benar.
   - Test adapter (Gemini & NVIDIA): parsing header `Retry-After` dari
     fixture 429 → `ProviderError.retryAfterMs` terisi benar.
   - Test server: request yang kena `rate_limited` → pool key yang
     bersangkutan benar-benar ter-cooldown setelahnya (bisa dicek lewat
     request berikutnya memilih key lain).

## Eksplisit DI LUAR scope (jangan dikerjakan sekarang)

- Background health-check job (proaktif tes key cooldown pakai `listModels()`)
- Exponential backoff progresif (counter percobaan per key)
- Penanganan `kind: "auth_failed"` (nonaktif permanen)
- Persist cooldown state ke SQLite/KV (itu Step 5)

Tandai keempatnya dengan komentar `// SENGAJA belum ada: ... (Step N / TBD)`
di titik kode yang relevan, mengikuti konvensi yang sudah ada.

## Definition of Done

Mengikuti standar `CLAUDE.md` — bukan klaim, tapi bukti:

```bash
bun run lint
bun run typecheck
bun run db:push:test   # kalau ada test yang butuh DB
bun run test
bun run anti-mock-check
```

Plus bukti fungsional konkret: skenario curl yang memicu 429 asli dari salah
satu provider (atau simulasi via fixture kalau tidak bisa memicu 429 asli
tanpa membakar kuota), lalu curl kedua ke key/provider yang sama menunjukkan
otomatis dialihkan atau ditolak dengan pesan cooldown yang jelas.

## Pertanyaan terbuka untuk direview manusia sebelum merge

- Apakah 30 detik default cooldown sudah pas, atau perlu disesuaikan per
  provider (Gemini vs NVIDIA punya kebijakan rate limit berbeda)?
- Bentuk pasti response error "semua key habis" — apakah reuse skema error
  yang sudah ada di `packages/server/src/schemas/chat-completion.ts`, atau
  perlu skema baru?
