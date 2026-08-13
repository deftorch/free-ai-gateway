# CLAUDE.md — Instruksi Agen (Root)

Baca file ini penuh sebelum mengerjakan task apa pun di repo ini. Untuk kerja di dalam
satu package/adapter tertentu, baca juga `CLAUDE.md` di direktori itu — file ini hanya
memuat aturan yang berlaku lintas repo.

## Apa proyek ini

AI Gateway open-source: satu endpoint (kompatibel OpenAI Chat Completions & Anthropic
Messages) ke banyak provider LLM, termasuk tier gratis, dengan multi-key pooling,
fallback lintas provider, dan akses lewat Web UI/CLI/MCP/REST. Detail lengkap desain
ada di `docs/desain-free-ai-gateway-gabungan.md` (dokumen sumber — jangan diedit tanpa
diskusi eksplisit dengan manusia, itu adalah acuan keputusan produk).

## Arsitektur ringkas

```
Clients (Web UI / CLI / MCP client / SDK / curl)
   -> Edge/Entry Layer (auth, rate-limit, validasi)
   -> Routing Core (resolver, load balancer, key pool manager, fallback, cache)
   -> Provider adapters (satu folder per provider di adapters/)
```

**Routing Core (`packages/core`) adalah satu-satunya sumber kebenaran.** Web UI, CLI,
`server`, dan `mcp-server` semuanya front tipis yang memanggil core yang sama —
jangan duplikasi logika routing/key-pool di package lain.

## Aturan keras — jangan dilanggar

1. **Dilarang menulis mock/stub/placeholder di kode produksi.** Kalau task tidak bisa
   diselesaikan karena butuh key/akses/informasi yang belum tersedia — **berhenti dan
   tanya ke manusia**, jangan isi dengan mock diam-diam. CI akan menolak PR yang
   mengandung `TODO|FIXME|mock|stub|placeholder|NotImplementedError` di kode non-test
   (lihat `.github/workflows/anti-mock.yml`).
2. **Jangan hardcode nama model dari memori.** Nama model gratis berubah tanpa
   pemberitahuan. Ambil dari `registry/free-tier.json` atau hasil health-check
   runtime, jangan menulis literal string nama model di kode adapter/core.
3. **Provider baru = tambah adapter baru di `adapters/`, bukan `if/else` baru di
   `packages/core`.** Kontrak ada di `packages/core/src/adapter.contract.ts` — ditulis
   dan diubah oleh manusia, bukan oleh agen tanpa review eksplisit.
4. **Virtual key SELALU di-lookup ke database untuk menentukan `tenant_id`.** Jangan
   pernah menerima `tenant_id` mentah dari header/parameter klien. Ini aturan
   keamanan inti — lihat `docs/adr/0004-virtual-key-selalu-lookup-db.md`.
5. **Kolom `tenant_id` wajib ada di setiap tabel baru** yang menyimpan data milik
   user, walau nilainya cuma konstanta `"default"` di mode single-tenant. Lihat
   `docs/adr/0002-multi-tenant-sejak-skema-hari-pertama.md`.
6. **Keputusan stack yang sudah diambil ada di `docs/adr/`.** Baca sebelum
   mengusulkan library/pola berbeda dari yang sudah diputuskan di sana.

## Definition of Done — konkret, bukan subjektif

Jangan klaim "sudah selesai/sudah jalan" tanpa bukti. Contoh DoD yang benar:
"`curl` ke `POST /v1/chat/completions` dengan model Gemini mengembalikan status 200
dan response teks nyata dari API Gemini, bisa direproduksi siapa saja lewat langkah
di README." Contoh yang salah: "adapter Gemini sudah dibuat."

Sebelum melaporkan task selesai, jalankan dan tunjukkan output nyata dari:

```bash
bun run lint
bun run typecheck
bun run test
bun run anti-mock-check
```

## Cara kerja per task

- Satu task = satu step walking skeleton. **Cek `docs/walking-skeleton-checklist.md`
  dulu untuk tahu sedang di step berapa** sebelum mulai kerja — jangan mengerjakan
  step yang belum gilirannya, dan jangan mengerjakan beberapa step sekaligus dalam
  satu sesi. Update checklist itu (⬜→🔄→✅) saat step dimulai/selesai.
- Untuk siklus TDD (Red-Green-Refactor) yang wajib dipakai di bagian keamanan &
  logika murni (key rotation, cooldown, fallback, auth), lihat contoh konkret di
  `docs/tdd-example-key-rotation.md` sebelum menulis test pertama di area itu.
- Sebelum menulis kode baru, cari pola existing di package yang sama dan ikuti pola
  itu kecuali ada alasan kuat untuk berbeda — tulis alasannya di deskripsi PR.
- Untuk perubahan yang menyentuh kontrak (`adapter.contract.ts`, skema DB, format
  virtual key), **jelaskan rencana dulu** (file yang disentuh, apakah interface
  berubah) sebelum menulis kode — jangan langsung implementasi.
- Kalau ada dua cara valid untuk implementasi, jelaskan trade-off singkat
  (paling cepat vs paling mudah diperluas) di deskripsi PR/commit, biarkan manusia
  memilih untuk perubahan yang menyentuh arsitektur.
- Di akhir task, sebutkan asumsi dan keterbatasan yang diambil (concurrency, edge
  case, ekstensibilitas ke provider lain).

## Test

- Logika murni (key rotation, cooldown, fallback) dan auth/virtual-key: TDD ketat,
  wajib ada test sebelum merge.
- Adapter provider: wajib lulus contract test di `adapters/_contract-tests/`
  terhadap fixture response **nyata** (bukan bentuk response yang ditebak) — lihat
  `adapters/CLAUDE.md`.
- Web UI: test manual/E2E ringan cukup, tidak perlu TDD ketat.

## Struktur repo

```
packages/core/        Routing core, key pool manager, kontrak adapter
packages/server/       Hono app (HTTP entry) — serverless & self-host
packages/mcp-server/    MCP server, wrap core sebagai tool
packages/cli/           CLI (aigw)
packages/web/           React dashboard
adapters/<provider>/    Satu folder per provider, ikuti adapter.contract.ts
adapters/_contract-tests/  Contract test + fixture nyata untuk semua adapter
registry/free-tier.json Registry lokal provider gratis (§10.3)
docs/adr/               Architecture Decision Records — keputusan yang tidak boleh dibalik tanpa diskusi
deploy/                 Dockerfile, docker-compose, wrangler.toml
```

## Perintah referensi cepat

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Jalankan semua package dalam mode dev |
| `bun run test` | Jalankan semua test (unit + contract) |
| `bun run test:contract` | Jalankan contract test adapter saja |
| `bun run lint` / `bun run typecheck` | Gate wajib sebelum PR |
| `bun run anti-mock-check` | Cek manual mock/stub — sama dengan yang dijalankan CI |
