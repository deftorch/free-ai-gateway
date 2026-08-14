# Task Brief — Step 6: Config File + `docker-compose.yml`

> Status referensi: hasil review yang menemukan `deploy/` (dibuat sejak
> commit awal, sebelum Step 1-5 ada) sudah usang dan tidak sinkron dengan
> implementasi nyata. Step 6 ini SEBAGIAN BESAR adalah perbaikan, bukan
> fitur baru. Ikuti DoD yang mensyaratkan bukti `docker compose up -d`
> benar-benar jalan end-to-end, bukan cuma "sudah dibuat".

## Masalah yang harus diperbaiki (urutan prioritas)

### 1. [PALING KRITIS] `deploy/Dockerfile` — daftar `COPY package.json` tidak lengkap

Workspace glob di root `package.json`: `["packages/*", "adapters/*", "adapters/_contract-tests"]`
— mencakup SEMUA folder di `packages/` dan `adapters/` secara otomatis.

Tapi `deploy/Dockerfile` stage `deps` cuma copy manual sebagian:
```dockerfile
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/mcp-server/package.json packages/mcp-server/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY adapters/gemini/package.json adapters/gemini/package.json
COPY adapters/_contract-tests/package.json adapters/_contract-tests/package.json
```
**Hilang**: `adapters/nvidia-nim/package.json` (provider yang sudah jalan
sejak Step 1!), `packages/web/package.json`.

**Perbaikan**: tambah baris `COPY` yang hilang untuk KEDUANYA. Verifikasi
`bun install --frozen-lockfile` di dalam container benar-benar sukses
(bukan cuma asumsi) — dan verifikasi image hasil build benar-benar bisa
melayani request ke `provider: "nvidia-nim"`, bukan cuma Gemini.

*(Opsional, kalau mau lebih tahan terhadap workspace baru di masa depan:
pertimbangkan `COPY packages/*/package.json packages/*/package.json` style
wildcard alih-alih daftar manual — tapi cek dulu apakah Docker `COPY` di
base image ini mendukung glob semacam itu sebelum diterapkan.)*

### 2. `deploy/docker-compose.yml` — env var salah nama, data akan hilang tiap restart

```yaml
environment:
  - DATABASE_URL=file:/data/gateway.db   # ❌ SALAH, kode tidak pernah baca ini
  - KV_DRIVER=redis                       # ❌ Sudah diputuskan TIDAK dibangun (Step 5)
  - REDIS_URL=redis://redis:6379
```

Kode (`packages/core/src/db/index.ts`) hanya membaca `process.env.DB_FILE_PATH`.
`DATABASE_URL` tidak terhubung ke apa pun — SQLite akan jatuh ke path default
di dalam container, **di luar volume `gateway-data` yang di-mount**, sehingga
seluruh state (virtual key, cooldown) hilang setiap `docker compose restart`.

**Perbaikan**:
```yaml
environment:
  - DB_FILE_PATH=/data/gateway.sqlite   # nama var & extension yang benar
volumes:
  - gateway-data:/data
```
- **Hapus seluruh service `redis` dan `KV_DRIVER`** dari file ini — sudah
  diputuskan eksplisit di Step 5 bahwa abstraksi KV tidak dibangun. Container
  Redis yang jalan tapi tidak pernah dipakai kode cuma membingungkan orang
  yang baru pertama coba proyek ini.
- Hapus juga `redis-data` dari `volumes:` di bagian bawah file.

### 3. `.env.example` — perbaiki nama variabel yang salah

```
DATABASE_URL=file:./local.db     # ❌ ganti nama var
KV_DRIVER=memory                  # ❌ hapus baris ini, tidak pernah dibaca kode
```
Ganti jadi:
```
DB_FILE_PATH=./local.sqlite       # nama var yang benar-benar dipakai kode
```

### 4. `deploy/wrangler.toml` — JANGAN diklaim berfungsi

File ini menargetkan Cloudflare Workers, tapi kode saat ini bergantung pada
`bun:sqlite` (tidak ada di runtime Workers) dan `process.env` top-level
(Workers pakai binding `c.env`, bukan `process.env` global). File ini
**tidak akan bisa di-deploy** hari ini.

**Perbaikan minimal untuk Step 6** (bukan memperbaiki Workers support —
itu di luar scope, butuh pekerjaan arsitektur besar sendiri):
- Tambah komentar banner jelas di baris pertama file:
  `# BELUM FUNGSIONAL — lihat docs/adr/000X-workers-belum-didukung.md (TBD)`
- Sebut eksplisit di README bagian deploy: "Target Cloudflare Workers
  direncanakan tapi belum didukung; gunakan Docker/self-host untuk saat ini."
- JANGAN hapus filenya (masih berguna sebagai starting point nanti), tapi
  jangan biarkan orang mengira ini siap pakai.

## Soal "Config file" di judul Step 6

Tidak perlu membangun format config baru (JSON/YAML/dsb) untuk step ini.
`.env` **sudah** menjadi config file proyek ini sejak awal — tidak ada
kebutuhan konkret sekarang untuk sesuatu yang lebih kompleks (Step 7/8
CLI & Web UI mungkin butuh itu nanti, tapi belum ada yang memintanya).
Fokus Step 6 murni: **pastikan config yang sudah ada (`.env.example`) akurat,
dan Docker benar-benar bisa dipakai apa adanya.**

## Definition of Done

```bash
bun run lint
bun run typecheck
bun run test
bun run anti-mock-check
```

Plus bukti fungsional konkret (**ini yang paling penting untuk step ini**):

1. `docker compose -f deploy/docker-compose.yml up -d --build` — build
   sukses tanpa error, tempel log build lengkap.
2. `curl` ke `/v1/chat/completions` lewat container, **untuk KEDUA provider**
   (Gemini dan NVIDIA) — bukti bug #1 sudah benar-benar teratasi.
3. `docker compose restart gateway`, lalu curl lagi pakai virtual key yang
   sama — harus tetap berhasil (bukti data di volume benar-benar persisten,
   bukan cuma di memori container yang hilang saat restart).
4. `docker compose down && docker compose up -d` (bukan cuma restart,
   tapi hapus & buat ulang container) — data virtual key/cooldown tetap
   ada, membuktikan volume yang di-mount benar, bukan filesystem container
   yang kebetulan belum di-recycle.

## Eksplisit DI LUAR scope

- Format config file baru selain `.env`
- Cloudflare Workers benar-benar jalan (KV_DRIVER, D1, dsb)
- CLI/Web UI untuk kelola container (itu Step 7-8)
