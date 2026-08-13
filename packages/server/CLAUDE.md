# CLAUDE.md — packages/server

Baca juga `CLAUDE.md` root.

## Isi package ini

Entry point HTTP (Hono), dipakai untuk deploy serverless (Cloudflare Workers) dan
self-host (Node/Bun). Handler di sini harus TIPIS — logika sesungguhnya (routing,
key pool, fallback) ada di `packages/core`, dipanggil dari sini, bukan ditulis ulang.

## Status saat ini

`POST /v1/chat/completions` mendukung 2 provider: Gemini dan NVIDIA NIM. Step 0
selesai (DoD Gemini terbukti curl nyata). Step 1 sedang berjalan — DoD-nya:
buktikan kontrak `ProviderAdapter` tetap generic dengan provider kedua yang
formatnya beda jauh (Gemini custom vs NVIDIA NIM OpenAI-compatible).

**Field `provider` WAJIB diisi eksplisit di body request** (bukan bagian
format OpenAI asli) — sampai Step 9 punya resolver otomatis dari nama model.
Lihat `src/schemas/chat-completion.ts` untuk detail.

Registry adapter ada di `const adapters` di `src/index.ts` — tambah provider
baru = tambah 1 baris di situ + 1 baris di `envVarByProvider`, TIDAK menulis
`if/else` per provider di handler (itu justru yang mau dibuktikan tidak perlu
oleh kontrak `ProviderAdapter`).

Yang SENGAJA belum ada di sini (scope step berikutnya, jangan ditambah sebelum
gilirannya): virtual key/tenant lookup (Step 2), multi-key/rotasi (Step 3),
auto-resolve provider + fallback (Step 9). `getApiKey()` di `src/index.ts` baca
langsung dari env var — itu bukan kelalaian, itu batas scope Step 0-1.

## Aturan

- Auth middleware WAJIB lookup `tenant_id` dari database lewat virtual key, tidak
  pernah dari header mentah (`docs/adr/0004-...`).
- Format request/response OpenAI & Anthropic divalidasi pakai Zod schema — taruh
  di `src/schemas/`, jangan validasi manual dengan if/else.
