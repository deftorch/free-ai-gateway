# Free AI Gateway

> ⚠️ **Status: scaffold repo, belum ada fitur berjalan.** Struktur ini dibuat untuk
> mendukung pengembangan dengan bantuan agen AI (Claude Code dkk) secara aman dan
> konsisten. Lihat `CLAUDE.md` untuk aturan kerja, dan
> `docs/desain-free-ai-gateway-gabungan.md` §12.1 untuk urutan walking skeleton
> yang harus diikuti.

AI Gateway open-source: satu endpoint kompatibel OpenAI Chat Completions &
Anthropic Messages ke banyak provider LLM (termasuk tier gratis), dengan
multi-key pooling, fallback lintas provider, dan akses lewat Web UI, CLI, MCP,
dan REST API langsung.

## Kenapa proyek ini ada

Provider LLM tier gratis (Gemini, Groq, Cerebras, OpenRouter, dll) masing-masing
punya rate limit yang ketat sendiri-sendiri. Gateway ini menggabungkan banyak key
dari banyak provider di belakang satu endpoint, dengan fallback otomatis saat satu
key/provider kena limit — supaya kuota gratis kolektif jauh lebih besar daripada
satu key satu provider.

## Struktur repo

```
packages/core/        Routing core, key pool manager, kontrak adapter provider
packages/server/       Entry HTTP (Hono) — serverless (Cloudflare Workers) & self-host
packages/mcp-server/    MCP server — expose gateway sebagai tool MCP
packages/cli/           CLI `aigw`
packages/web/           Dashboard React
adapters/<provider>/    Satu folder per provider LLM
adapters/_contract-tests/  Contract test + fixture nyata untuk semua adapter
registry/free-tier.json Registry provider gratis (snapshot, cek §10.3)
docs/adr/               Keputusan arsitektur yang tidak boleh dibalik tanpa diskusi
deploy/                 Dockerfile, docker-compose.yml, wrangler.toml
```

## Mulai kembangkan

```bash
bun install
cp .env.example .env   # isi minimal 1 provider key
bun run dev
```

## Verifikasi Step 0 & Step 1 (single-file proxy → 2 provider)

Step 0 (Gemini) sudah ✅ tercentang di `docs/walking-skeleton-checklist.md` —
sudah dibuktikan lewat curl nyata sebelumnya. Step 1 menambah provider kedua
(NVIDIA NIM) untuk membuktikan kontrak `ProviderAdapter` generic, masih 🔄
sampai langkah di bawah ini dijalankan — sandbox tempat kode ini ditulis tidak
punya akses jaringan ke `generativelanguage.googleapis.com` maupun
`integrate.api.nvidia.com`, jadi ini harus dijalankan di mesin Anda sendiri.

**Catatan breaking change**: body request sekarang wajib menyertakan field
`provider` (`"gemini"` atau `"nvidia-nim"`) — bukan bagian format OpenAI asli,
ini extension sementara sampai Step 9 punya resolver otomatis. Kalau Anda
sudah pernah jalankan curl Step 0 sebelumnya, tambahkan field ini sekarang.

### 1. Siapkan API key

Gemini: [Google AI Studio](https://aistudio.google.com/). NVIDIA NIM:
[build.nvidia.com](https://build.nvidia.com/) (key berformat `nvapi-...`,
1.000 kredit inferensi gratis untuk akun baru). Keduanya tidak butuh kartu kredit.

```bash
cp .env.example .env
```

Edit `GEMINI_API_KEYS=` dan `NVIDIA_API_KEYS=` di `.env` (satu key masing-masing
untuk Step 0-1, tanpa koma — rotasi multi-key baru Step 3).

### 2. Install & jalankan

```bash
bun install
bun --filter @free-ai-gateway/server dev
```

Tunggu sampai muncul log `Free AI Gateway listening on http://localhost:8787`.

### 3. Cek model apa saja yang tersedia untuk key Anda (opsional tapi disarankan)

Nama model berubah dari waktu ke waktu (lihat catatan di
`registry/free-tier.json`) — jangan asumsikan nama model dari dokumen ini masih
berlaku. Cek langsung:

```bash
# Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models" \
  -H "x-goog-api-key: $GEMINI_API_KEY_ANDA" | grep '"name"'

# NVIDIA NIM (atau langsung browse https://build.nvidia.com/models)
curl "https://integrate.api.nvidia.com/v1/models" \
  -H "Authorization: Bearer $NVIDIA_API_KEY_ANDA" | grep '"id"'
```

### 4. Non-streaming — DoD utama, dua provider

```bash
# Gemini
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Balas dengan satu kalimat: apa ibukota Indonesia?"}]
  }' | jq

# NVIDIA NIM -- ganti model sesuai hasil step 3, mis. meta/llama-3.3-70b-instruct
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "nvidia-nim",
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Balas dengan satu kalimat: apa ibukota Indonesia?"}]
  }' | jq
```

Yang diharapkan untuk KEDUANYA: HTTP 200, `choices[0].message.content` berisi
teks jawaban nyata (bukan karangan/placeholder) — dari dua provider berbeda,
lewat endpoint yang sama, adapter yang berbeda.

### 5. Streaming (opsional, minimal salah satu provider)

```bash
curl -N http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "nvidia-nim",
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Hitung 1 sampai 5"}],
    "stream": true
  }'
```

Yang diharapkan: baris `data: {...}`, diakhiri `data: [DONE]`.

### 6. Hasil Verifikasi Aktual (DoD Terpenuhi)

Berikut adalah bukti nyata dari hasil curl *end-to-end* yang membuktikan Step 1 berjalan dengan sempurna:

**Output Gemini (`gemini-3.6-flash`):**
```json
{"id":"nV19avaOEMzajuMPtPTCkA0","object":"chat.completion","created":1786600864,"model":"gemini-3.6-flash","choices":[{"index":0,"message":{"role":"assistant","content":"Jakarta"},"finish_reason":"stop"}],"usage":{"prompt_tokens":13,"completion_tokens":1,"total_tokens":14}}
```

**Output NVIDIA NIM (`meta/llama-3.1-8b-instruct`):**
```json
{"id":"chatcmpl-0977cd0b-1682-456a-8a8c-399bc4a6b35c","object":"chat.completion","created":1786600891,"model":"meta/llama-3.1-8b-instruct","choices":[{"index":0,"message":{"role":"assistant","content":"Ibukota Indonesia adalah Jakarta."},"finish_reason":"stop"}],"usage":{"prompt_tokens":48,"completion_tokens":9,"total_tokens":57}}
```

(Status di `docs/walking-skeleton-checklist.md` untuk Step 1 telah resmi diperbarui menjadi ✅ berkat bukti di atas).

### 7. Verifikasi Step 2: Virtual API Key & Database

Mulai dari Step 2, _endpoint_ `/v1/chat/completions` dilindungi oleh **Virtual API Key**. Anda tidak bisa lagi menembaknya tanpa *header* autentikasi.

**A. Setup Database & Membuat Virtual Key Pertama Anda:**
Jalankan migrasi skema database terlebih dahulu, lalu jalankan skrip CLI ringan untuk melakukan *seed* penyewa (tenant) `default` dan menerbitkan kunci baru:
```bash
bun run db:push
bun run scripts/create-virtual-key.ts
```
*(Catatan: Simpan kunci `fag_sk_...` yang muncul, karena ini hanya ditampilkan sekali!)*

**B. Pengujian Akses (Auth Middleware):**
Gunakan kunci rahasia tersebut di dalam *header* `Authorization` saat melakukan cURL:
```bash
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fag_sk_KUNCI_RAHASIA_ANDA" \
  -d '{
    "provider": "gemini",
    "model": "gemini-3.6-flash",
    "messages": [{"role": "user", "content": "Hai"}]
  }'
```

Untuk menguji fitur keamanan (ADR 0004), Anda dapat mencoba menyelundupkan *header* `X-Tenant-Id: peretas` — *gateway* ini dijamin akan mengabaikannya dan tetap murni menggunakan data dari *database* lokal (Drizzle + SQLite).

Untuk kontribusi dengan Claude Code atau agen AI lain: **baca `CLAUDE.md` dulu**
(otomatis dibaca sebagian besar coding agent saat masuk repo ini). File itu berisi
aturan keras yang wajib diikuti (anti-mock, anti-hardcode nama model, aturan
keamanan virtual key) dan Definition of Done yang konkret.

## Deploy

- **Cloudflare Workers**: `wrangler deploy` (config di `deploy/wrangler.toml`)
- **Self-host Docker**: `docker compose -f deploy/docker-compose.yml up -d`

## Dokumen desain lengkap

`docs/desain-free-ai-gateway-gabungan.md` — arsitektur, perbandingan kompetitor,
skema data, keamanan, metodologi kerja dengan AI (§12), dan roadmap.

## Kontribusi

Lihat `CONTRIBUTING.md`. Laporan keamanan: lihat `SECURITY.md` — jangan buka
issue publik untuk kerentanan.

## Lisensi

MIT — lihat `LICENSE`.
