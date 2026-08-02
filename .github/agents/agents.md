# AGENTS.md — Free AI Gateway

Panduan persisten untuk AI Agent di repo ini. File ini dibaca otomatis
setiap sesi — jangan taruh riwayat sesi/detail temuan di sini, itu tempatnya
di `free-ai-gateway-dokumentasi-2.md` (lihat bagian paling bawah).

## Ringkasan Proyek

**Free AI Gateway** — gateway multi-provider untuk LLM gratis/murah.
Monorepo Turborepo, 4 workspace:
- `apps/gateway` — Next.js 15.5.22 (App Router). HTTP surface + dashboard admin.
- `apps/worker` — Cloudflare Worker. Edge entry point.
- `packages/core` — logika bisnis headless, TypeScript murni, tanpa dependency framework HTTP.
- `packages/database` — Postgres/Neon (Drizzle ORM) + ClickHouse.

**Pola arsitektur inti: "Headless Core, Multiple Front Doors".**
`packages/core` mengekspos `processChatRequest({ token, body })` yang
menerima/mengembalikan payload polos (bukan `Request`/`Response`). Baik
`apps/gateway` (route handler Next.js) maupun `apps/worker` (Cloudflare
`fetch()` handler) cuma pembungkus tipis yang menerjemahkan
request/response platform-spesifik ke/dari payload generik ini. Satu basis
kode, tiga target deploy (Vercel/Node.js, Docker self-host, Cloudflare edge).

## Perintah Kerja

```bash
# Install (dari root)
bun install
# Kalau `bun` belum ada di environment & bun.sh tidak bisa diakses:
npm install -g bun   # paket npm `bun` ambil binary lewat GitHub Releases

# Build penuh monorepo (root) — WAJIB exit 0 sebelum klaim "build sukses"
bun run build

# Test penuh monorepo (root)
bun test

# Typecheck per-app (JALANKAN TERPISAH untuk gateway & worker, bukan cuma salah satu)
cd apps/gateway && bunx tsc --noEmit
cd apps/worker && bunx tsc --noEmit

# Lint (apps/gateway)
cd apps/gateway && bunx eslint .

# Dry-run deploy Worker (verifikasi bundling tanpa kredensial nyata)
cd apps/worker && bunx wrangler deploy --dry-run

# Generate migrasi SQL (review manual sebelum apply ke DB nyata)
cd packages/database && bunx drizzle-kit generate

# Docker (BELUM PERNAH berhasil diverifikasi di sandbox mana pun sejauh ini —
# lihat §6-A/§11.3/§12.6/§13.6 di dokumentasi. Kalau kamu jalankan ini di
# AI lokal, docker kemungkinan besar TERSEDIA — ini prioritas
# tertinggi yang tersisa, lihat bagian "Item Terbuka" di bawah.)
docker build -t free-ai-gateway .
docker run -p 3000:3000 --env-file .env free-ai-gateway
curl http://localhost:3000/health
```

## Level Verifikasi — Jangan Klaim Lebih Kuat dari yang Dijalankan

Urutkan eksplisit di laporan/commit message, dari lemah ke kuat:
1. Syntax-check per-file (esbuild single file) — lemah, cuma menangkap error sintaks.
2. `tsc --noEmit` / `eslint` per-file atau per-app — sedang.
3. `next build` / `bun test` full run di root — kuat, ini yang dianggap "terverifikasi".

Kalau sandbox tidak bisa menjalankan level kuat (mis. tidak ada `docker`),
**katakan itu eksplisit**, jangan diam-diam menurunkan standar atau
mengasumsikan "pasti berhasil" karena bagian lain sudah lolos.

## Konvensi & Pola yang HARUS Diikuti

### Dependency Injection untuk env var (`packages/core`, `packages/database`)
`process.env` TIDAK boleh dibaca langsung di `packages/core` maupun
`packages/database` (Cloudflare Worker tidak punya `process.env` bawaan).
Pola yang dipakai — **ikuti persis, jangan buat pendekatan baru**:
- `packages/core/src/config/env.ts` — `configureCoreEnv(env)`,
  `getEnvVar()`, dst.
- `packages/database/src/config/env.ts` — `configureDatabaseEnv(env)`, API
  identik tapi **state independen** (SENGAJA tidak reuse `packages/core`,
  karena `core` sudah mengimpor `database` langsung — reuse akan jadi
  circular dependency antar package).
- Client/singleton apa pun (`db`, `kv`, `clickhouse`, `qstash`,
  `openrouterAdapter`) HARUS lazy-init (dibuat saat property/method pertama
  diakses, bukan saat modul di-*import*), biasanya lewat `Proxy` atau getter
  function. Alasannya: Cloudflare Worker meng-inject config lewat
  `configureCoreEnv()`/`configureDatabaseEnv()` di awal `fetch()` — kalau
  client dibuat eager di top-level saat modul di-import, env-nya sudah
  kepalang dibaca sebelum config di-inject.
- `apps/worker/src/index.ts` harus memanggil KEDUA fungsi config
  (`configureCoreEnv` dan `configureDatabaseEnv`) di `injectEnv()`.

### Perbaikan tipe (`any` → tipe akurat)
Jangan ganti `any` ke `unknown` sebagai jalan pintas — itu cuma memindahkan
error karena `unknown` butuh narrowing di titik pakai. Telusuri dulu bentuk
data sebenarnya: skema Drizzle (`typeof table.$inferSelect`) untuk data dari
database, atau cara datanya benar-benar diakses di kode pemanggil untuk data
dari request/response API.

### `ioredis` di Edge Middleware
`ioredis` di-require di `packages/core/src/kv/client.ts`, dan modul itu ikut
masuk ke bundle Edge Middleware lewat `middleware.ts` →
`validation/waf.ts` → `kv/client.ts`. `ioredis` mengandung
`require("node:diagnostics_channel")` yang tidak ada di Edge Runtime.
Solusinya BUKAN string-concatenation trick (`"io"+"redis"`) lagi — itu sudah
diganti `webpack()` hook di `apps/gateway/next.config.ts` yang meng-alias
`ioredis: false` khusus saat `nextRuntime === "edge"`. Kalau menyentuh file
ini, JANGAN kembalikan ke trik string-concat; kalau perlu mengubah mekanisme
exclusion-nya, uji dulu secara empiris di copy terisolasi (`cp -r` ke `/tmp`)
sebelum diterapkan ke source asli — build gagal total tanpa alias ini
(`UnhandledSchemeError`), sudah dikonfirmasi, bukan teori.

## Keputusan yang SENGAJA Tidak Dieksekusi — Jangan Reverse Tanpa Persetujuan Eksplisit

**Migrasi `middleware.ts` → `proxy.ts`.** Diteliti & diuji empiris tuntas:
proyek masih di Next.js 15.5.22 (bukan 16), dan Next 15 tidak mengenali
`proxy.ts` sebagai file convention sama sekali — migrasi sekarang akan
mematikan WAF/CORS/dashboard-block secara diam-diam tanpa error/warning
apa pun saat build. **Jangan eksekusi migrasi ini kecuali user secara
eksplisit minta upgrade Next.js ke v16 dulu.**

## Alur Kerja yang Diharapkan

1. **Baca `free-ai-gateway-dokumentasi-2.md` dulu**, terutama §7 (tabel
   status hutang teknis) dan §9 (rekomendasi prioritas) — sumber kebenaran
   soal apa yang sudah/belum dikerjakan. File ini (`CLAUDE.md`) cuma
   ringkasan konvensi yang stabil; riwayat & detail keputusan ada di sana.
2. **Setelah menyelesaikan sesuatu, update dokumentasi itu di tempat** —
   tambah section baru bernomor urut berikutnya (§14, §15, dst.), lalu
   sinkronkan tabel §7 dan daftar §9 supaya tidak basi.
3. Kalau menemukan bug/masalah yang tidak diminta secara eksplisit tapi
   ditemukan saat kerja, **catat sebagai item baru di dokumentasi, jangan
   diam-diam diperbaiki tanpa dilaporkan**.
4. Untuk perubahan yang berisiko silent-regression (bundling, edge runtime,
   middleware, DI), **uji empiris di copy terisolasi dulu** sebelum
   diterapkan ke source asli — jangan cuma baca dokumentasi resmi lalu
   asumsikan aman.

## Item Terbuka Saat Ini (ringkas — detail lengkap di §13.6 dokumentasi)

- 🔴 **Verifikasi `docker build`/`docker run` sungguhan** — belum pernah
  berhasil diverifikasi di sandbox mana pun. Kalau `docker` tersedia di
  environment AI ini, jalankan ini duluan.
- Keputusan migrasi `proxy.ts` — butuh keputusan produk (lihat bagian di
  atas), bukan kerja teknis.
- Sisa referensi Groq deprecated (`llama-3.3-70b-versatile`) di
  `packages/database/drizzle/seed.ts` & UI dashboard.
- Sisa audit `any`/`as any`/`console.log`/`.catch(() => {})` di luar yang
  sudah dibereskan sebagai error build keras.
- Test coverage untuk `apps/worker` — masih nol file test sama sekali.
- Opsional: kecilkan bundle `apps/worker` (~2510 KiB) dengan `external`
  config khusus `ioredis` di build esbuild/wrangler — Worker tidak pernah
  pakai mode self-hosted Redis, jadi ini cuma bloat, bukan bug.
