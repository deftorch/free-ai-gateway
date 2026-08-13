# CLAUDE.md — packages/core

Baca juga `CLAUDE.md` di root sebelum ini.

## Isi package ini

Routing Core: satu-satunya sumber kebenaran untuk resolusi model/provider, load
balancing, key pool management, fallback chain, dan cache. `server`, `mcp-server`,
dan `cli` semua memanggil modul di sini — jangan duplikasi logika di package lain.

## Kontrak — jangan diubah tanpa diskusi eksplisit

`src/adapter.contract.ts` adalah kontrak yang wajib dipenuhi setiap provider
adapter. Ini ditulis manusia dan perubahan padanya berdampak ke seluruh adapter
sekaligus. Kalau task membutuhkan perubahan di sini, **berhenti dan jelaskan
rencana dulu**, jangan langsung edit.

## Area keamanan-sensitif (lihat CODEOWNERS)

- `src/auth/` — validasi virtual key, lookup `tenant_id`. Wajib review manusia.
  Aturan: `tenant_id` HANYA dari lookup DB, tidak pernah dari input klien mentah
  (`docs/adr/0004-...`).
- `src/crypto/` — enkripsi provider key at-rest. Wajib review manusia.

## Pola yang harus diikuti

- Key pool manager (`src/key-pool/`): status key adalah `active | cooldown |
  exhausted | disabled`. Transisi status ditest dengan TDD ketat — lihat pola test
  yang sudah ada sebelum menulis test baru.
- Nama model: JANGAN hardcode. Ambil dari `registry/free-tier.json` (di root repo)
  atau hasil health-check runtime. Lihat CLAUDE.md root aturan keras poin 2.
- Storage: pakai interface `KVStore` abstrak (lihat `src/storage/kv-store.ts` bila
  sudah ada), jangan panggil Redis/Cloudflare KV langsung dari logika core —
  supaya core tetap portable serverless/self-host.

## Test

TDD ketat untuk: key rotation, cooldown/recovery, fallback chain, auth. Siklus:
Red (test gagal dulu) → Green (implementasi minimal) → Refactor (test tetap hijau).
Contoh konkret siklus ini (bukan implementasi produksi, cuma referensi pola) ada di
`docs/tdd-example-key-rotation.md` — baca sebelum menulis test pertama di area ini.

Config test: `vitest.config.ts` di package ini, jalankan `bun --filter
@free-ai-gateway/core test`. File test co-located dengan source
(`src/key-pool/key-pool.test.ts` di sebelah `key-pool.ts`), bukan folder `__tests__`
terpisah.
