# ADR 0005: Bun sebagai package manager & runtime dev/self-host, bukan pnpm/Node

**Status**: Diterima — menggantikan penyebutan "pnpm workspaces" di
`docs/desain-free-ai-gateway-gabungan.md` §5 (dokumen sumber tidak diedit
ulang isi tabelnya, tapi keputusan ini yang berlaku sejak ADR ini dibuat).

## Konteks

Repo awalnya di-scaffold dengan pnpm + Turborepo (sesuai draft awal §5 dokumen
desain), dengan `tsx` untuk menjalankan TypeScript langsung, `dotenv` untuk
memuat `.env`, dan `@hono/node-server` untuk listener HTTP self-host.

## Keputusan

Ganti seluruh tooling dev/self-host ke Bun: package manager (workspace,
`bun install`, `bun.lock`), runtime dev (`bun --watch`, tidak perlu `tsx`),
loading env (`bun --env-file`, tidak perlu `dotenv`), dan HTTP listener
self-host (`hono/bun`, tidak perlu `@hono/node-server`).

## Konsekuensi

- **Konsisten dengan ADR 0001** (portabilitas Workers/Deno/Bun/Node dari satu
  codebase): `packages/server/src/index.ts` (Hono app) tetap runtime-agnostic;
  hanya `serve.ts` (entry point self-host) yang eksplisit terikat Bun.
- Tiga dependency hilang sekaligus (`tsx`, `dotenv`, `@hono/node-server`) —
  lebih sedikit permukaan dependency untuk dijaga.
- `deploy/Dockerfile` pakai image `oven/bun` alih-alih Node.
- CI (`.github/workflows/*.yml`) pakai `oven-sh/setup-bun`, bukan
  `pnpm/action-setup` + `actions/setup-node`.
- `.github/dependabot.yml` pakai `package-ecosystem: "bun"` (didukung GA sejak
  Februari 2025).
- Konsekuensi yang perlu diawasi: `bun --env-file` dipakai dengan path relatif
  eksplisit (`../../.env`) di script `dev` — sama seperti masalah cwd yang
  sebelumnya ditemukan dengan `dotenv`, Bun juga cuma auto-load `.env` dari
  cwd proses, bukan dari root repo saat dijalankan lewat workspace/turbo.
- Deploy Cloudflare Workers (`deploy/wrangler.toml`) tidak terpengaruh sama
  sekali — Workers punya runtime listener sendiri, tidak memakai `serve.ts`.

## Untuk agen

Kalau menambah package baru, dev script memanggil `bun --watch src/....ts`
(atau `bun src/....ts` kalau tidak perlu watch), bukan `tsx`. Jangan tambahkan
kembali `tsx`/`dotenv`/`@hono/node-server` sebagai dependency tanpa diskusi.
