# Free AI Gateway — Unified LLM Gateway & Multi-Key Router

Endpoint OpenAI-compatible & Anthropic-compatible terpadu di depan berbagai provider LLM gratis (Groq, OpenRouter, Google AI Studio, dll) dengan fitur rotasi key otomatis, in-group failover, smart routing berbasis tugas, dashboard web UI, dan dukungan **Multi-Deployment** (Vercel, Netlify, Docker, Railway, Render, VPS).

---

## Fitur Utama

- **OpenAI, Anthropic & Ollama Compatible Surface:** Endpoint `/v1/chat/completions` (OpenAI format, SSE streaming), `/v1/messages` (Anthropic format), `/v1/embeddings` (OpenAI Vector Embeddings), serta emulasi native Ollama `/api/chat` (NDJSON stream) dan `/api/tags`.
- **Interactive OpenAPI Documentation:** Swagger UI interaktif di `/v1/docs` dan spesifikasi JSON OpenAPI 3.0 di `/v1/openapi.json`.
- **Supported Providers (15+ Providers):** Support out-of-the-box untuk **Groq**, **OpenRouter**, **Google AI Studio**, **Cerebras AI**, **Cloudflare Workers AI**, **SambaNova Cloud**, **Mistral AI**, **NVIDIA NIM**, **Cohere**, **Together AI**, **HuggingFace**, **Kilo Gateway**, **Fireworks AI**, **Novita AI**, **Hyperbolic AI**, serta **Universal Custom/Local LLM** (Ollama, LM Studio, vLLM, LocalAI).
- **Local & Custom LLM Discovery:** Menghubungkan server LLM lokal (Ollama, LM Studio, vLLM, LocalAI) via Universal Custom Adapter (`lib/providers/custom.ts`) dan auto-probing endpoint (`POST /api/internal/discover`).
- **Multi-Key Management & Advanced Rotation:** Rotasi key provider otomatis dengan strategi **LRU**, **Round-Robin**, dan **Unified Weighted Score** (memperhitungkan sisa kuota RPD, streak error, dan recency).
- **Turborepo Monorepo Architecture:** Terbagi menjadi `packages/core`, `packages/database`, `apps/gateway` (Next.js), dan `apps/worker` (Cloudflare).
- **Big Data Analytics & Realtime Telemetry:** Terintegrasi dengan **ClickHouse** untuk *log processing* jutaan baris tanpa *bottleneck*, serta menyiarkan metrik Dasbor secara *real-time* via Server-Sent Events (SSE).
- **Edge-Ready Deployments (Cloudflare Workers):** Mampu dieksekusi di V8 Isolates Cloudflare Edge, menjamin latensi *routing* sub-10ms dari lebih dari 300 kota di dunia (Zero-Latency Routing).
- **Advanced Security:** Memiliki modul WAF (Web Application Firewall) bawaan untuk pemblokiran IP/Geo, perlindungan terhadap **LLM Prompt Injection**, serta *fallback parser* sekunder (berbasis regex, bukan LLM) untuk katalog provider ketika parser markdown utama gagal mengenali format.
- **Multi-Window Quota Tracking & CRDT Sync:** Pelacakan kuota harian (`RPD`) dengan *CRDT-based async fallback* saat *Redis master* tumbang.
- **Modern Dashboard Web UI (`/dashboard`):** Antarmuka visual berbasis _dark glassmorphism_ dengan indikator *telemetry real-time*.

---

## Tabel Provider LLM Terhubung

| ID Provider (`providerId`) | Nama Service               | API Endpoint Base URL                                     | Tipe Kuota Gratis         |
| -------------------------- | -------------------------- | --------------------------------------------------------- | ------------------------- |
| `groq`                     | Groq                       | `https://api.groq.com/openai/v1`                          | 100% Free RPD             |
| `openrouter`               | OpenRouter                 | `https://openrouter.ai/api/v1`                            | Model `:free` (Auto Sync) |
| `google-ai-studio`         | Google AI Studio           | `https://generativelanguage.googleapis.com/v1beta/openai` | 1.500 RPD                 |
| `cerebras`                 | Cerebras AI                | `https://api.cerebras.ai/v1`                              | Free Tier (High Speed)    |
| `cloudflare`               | Cloudflare Workers AI      | `https://api.cloudflare.com/client/v4/accounts/.../ai/v1` | 10.000 Neuron/hari        |
| `sambanova`                | SambaNova Cloud            | `https://api.sambanova.ai/v1`                             | Free Tier (RDU Hardware)  |
| `mistral`                  | Mistral AI                 | `https://api.mistral.ai/v1`                               | La Plateforme Free        |
| `nvidia`                   | NVIDIA NIM                 | `https://integrate.api.nvidia.com/v1`                     | 1.000 Free Credits        |
| `cohere`                   | Cohere                     | `https://api.cohere.com/v2`                               | 1.000 Req/bulan           |
| `together`                 | Together AI                | `https://api.together.xyz/v1`                             | Free Trial Credits        |
| `huggingface`              | HuggingFace Serverless     | `https://api-inference.huggingface.co/v1`                 | Free Serverless Inference |
| `kilo`                     | Kilo Gateway               | `https://api.kilo.ai/v1`                                  | Free tanpa API Key        |
| `fireworks`                | Fireworks AI               | `https://api.fireworks.ai/inference/v1`                   | Free Trial Credits        |
| `novita`                   | Novita AI                  | `https://api.novita.ai/v3/openai`                         | $0.50 Free Credits/thn    |
| `hyperbolic`               | Hyperbolic AI              | `https://api.hyperbolic.xyz/v1`                           | $1.00 Free Credits        |
| `custom`                   | Universal Custom/Local LLM | Dinamis (`http://localhost:11434/v1`, dll)                | 100% Self-Hosted Free     |

---

```
packages/
├── core/                        # Headless Engine murni TypeScript
│   ├── src/router/              # Smart Routing, Circuit Breaker & Key Pool
│   ├── src/providers/           # 15+ Adapter Eksternal API 
│   ├── src/validation/          # WAF & Prompt Injection Safety Analyzer
│   ├── src/kv/                  # CRDT-enabled Redis Client
│   └── src/catalog/             # Catalog Scraper (parser markdown + fallback parser sekunder)
├── database/                    # Skema Drizzle ORM (Postgres) & ClickHouse
│   ├── drizzle/                 # Migrasi SQL
│   └── src/clickhouse.ts        # Klien OLAP Big Data
apps/
├── gateway/                     # Vercel/Next.js Deployment
│   ├── app/v1/                  # API Surface (OpenAI/Anthropic compatible)
│   ├── app/internal/stream/     # Real-time Telemetry (SSE)
│   ├── app/dashboard/           # Modern Glassmorphism Web UI
│   └── middleware.ts            # Edge WAF Gatekeeper
├── worker/                      # Cloudflare Workers Deployment
│   ├── src/index.ts             # V8 Isolates Entry Point (Zero-Latency)
│   └── wrangler.toml            # Konfigurasi Edge
```

## Panduan Integrasi AI Tools & Agents (Quickstarts)

Hubungkan Free AI Gateway ke alat AI favorit Anda dengan mudah:

| Kategori | Tools & Panduan Integrasi |
|---|---|
| **IDE & Editor Plugins** | [Cursor & Windsurf](./docs/integrations/cursor-windsurf.md) • [Continue.dev](./docs/integrations/continue-dev.md) • [Cline & Roo Code](./docs/integrations/cline-roo-code.md) |
| **CLI & Coding Agents** | [Claude Code](./docs/integrations/claude-code.md) • [Aider](./docs/integrations/aider.md) • [Hermes Agent](./docs/integrations/hermes-agent.md) • [Kilo Code](./docs/integrations/kilo-code.md) |
| **Autonomous Engineers** | [OpenHands](./docs/integrations/openhands.md) • [OpenClaw](./docs/integrations/openclaw.md) |
| **Frameworks & Multi-Agent** | [Vercel AI SDK](./docs/integrations/vercel-ai-sdk.md) • [CrewAI](./docs/integrations/crewai.md) • [PydanticAI](./docs/integrations/pydantic-ai.md) • [Google ADK](./docs/integrations/google-adk.md) |
| **Web UI & Chat Apps** | [Open WebUI](./docs/integrations/open-webui.md) • [LibreChat](./docs/integrations/librechat.md) • [SillyTavern](./docs/integrations/sillytavern.md) |
| **SDK & No-Code Workflow** | [Python/TS SDK & LangChain](./docs/integrations/langchain-python-sdk.md) • [n8n, Dify, & Flowise](./docs/integrations/n8n-dify.md) |

---

## Panduan Memulai (Quick Start Server)

### 1. Prasyarat

- Node.js 20+ atau Bun v1.1+
- PostgreSQL Database (misalnya [Neon DB](https://neon.tech/))
- Redis Key-Value Store (misalnya [Upstash Redis](https://upstash.com/))
- Akun Provider LLM Gratis (misalnya Groq, OpenRouter, Google AI Studio, dll)

### 2. Environment Variables (`.env.local`)

Buat file `.env.local` dan isi parameter berikut:

```env
DATABASE_URL=postgres://user:password@ep-xyz.neon.tech/main?sslmode=require
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
KEY_ENCRYPTION_SECRET=base64_generated_32_byte_secret
INTERNAL_ADMIN_TOKEN=your_secure_admin_token
CRON_SECRET=your_secure_cron_secret
```

> **Tips:** Buat secret enkripsi 32-byte menggunakan Node.js CLI:  
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### 3. Migrasi Database & Seeding

```bash
bun install
bun run db:generate   # Generate migrasi SQL
bun run db:migrate    # Terapkan migrasi ke database
bun run db:seed       # Seed data provider awal
```

### 4. Menjalankan Aplikasi & Unit Test

```bash
cd apps/gateway
bun run dev           # Jalankan dev server (localhost:3000)
bun run build         # Build production bundle
bun test              # Jalankan full unit test suite
```

---

## Menggunakan Dashboard Web UI

Akses `http://localhost:3000/dashboard` di browser Anda:

1. Masukkan `INTERNAL_ADMIN_TOKEN` Anda pada bilah otentikasi di sudut kanan atas.
2. **Key Pool Tab:** Tambahkan API Key provider gratis Anda.
3. **Gateway Tokens Tab:** Buat Gateway Token baru untuk proyek/aplikasi client Anda (`gw_...`).
4. **Smart Routing Tab:** Uji pengklasifikasi tugas instan (`coding`, `vision`, `general`).
5. **Live Playground:** Kirim prompt dan uji respon streaming LLM secara langsung di browser.

---

## Panduan Deployment (Multi-Deployment)

### A. Deploy ke Vercel

```bash
npx vercel
```

- Cron jobs diatur otomatis di `vercel.json`.

### B. Deploy ke Cloudflare Workers (Direkomendasikan)
Gunakan `apps/worker` untuk arsitektur Zero-Latency.

```bash
cd apps/worker
bun run deploy
```

### C. Deploy ke Netlify

1. Connect repositori di Netlify Dashboard.
2. Tambahkan Environment Variables di Netlify (`DATABASE_URL`, `KV_REST_API_URL`, dll).
3. GitHub Actions workflow `.github/workflows/cron-scheduler.yml` akan otomatis memicu cron background secara berkala.

### D. Deploy ke Docker / VPS / Railway / Render

Gunakan `Dockerfile` multi-stage bawaan atau `docker-compose.yml`:

```bash
docker-compose up -d --build
```

---

## Pengujian Unit & Validasi Kualitas

Seluruh komponen telah diuji dengan test suite komprehensif:

```bash
bun test ./lib/ ./app/ ./bin/ ./tests/ # 137/137 PASSED (100% LULUS di 44 test files)
bun run typecheck      # TypeScript 0 errors
bun run build          # Next.js Production Standalone Build Success
```

---

## Lisensi

MIT License — Bebas digunakan dan dikembangkan.
