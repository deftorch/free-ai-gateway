# Riset & Rancangan Arsitektur: "Free AI Gateway"
### Gateway LLM open-source, deploy serverless/self-host, multi-channel access (UI/CLI/MCP/SDK), aman, dan bisa menghandel banyak provider "gratis"

---

## 1. Ringkasan Eksekutif

Tujuan proyek: membangun **AI Gateway** open-source — satu pintu masuk (single endpoint, kompatibel format OpenAI/Anthropic/Gemini) ke banyak model LLM dari banyak provider, termasuk provider/tier **gratis** (Gemini free tier, Groq, OpenRouter free models, Cerebras, Cloudflare Workers AI, dsb) — dengan:

- **Deploy fleksibel**: serverless (Cloudflare Workers/Deno Deploy/Vercel) *atau* self-host (Docker/VPS/K8s), pakai codebase yang sama.
- **Multi-channel access**: Web UI (dashboard/admin), CLI, MCP Server (agar bisa dipakai Claude Code/Claude Desktop/agent lain), REST API, dan SDK.
- **Setup mudah**: satu file `.env`/wizard onboarding, docker-compose satu perintah, atau "Deploy to Cloudflare" button.
- **Keamanan terjamin**: virtual API key per user/tim, secrets terenkripsi, rate-limit, audit log, guardrails.
- **Handle "free" providers**: rotasi banyak API key gratis, load balancing, auto-fallback saat kena rate-limit/kuota habis, tracking kuota per key.

Riset di bawah membandingkan proyek sejenis yang sudah ada (LiteLLM, Portkey, Bifrost, OpenRouter, Cloudflare AI Gateway, MCP gateway) untuk menentukan *positioning* dan *stack* yang tepat, supaya proyek kalian tidak reinventing the wheel tapi mengisi celah yang belum digarap dengan baik oleh kompetitor.

---

## 2. Riset Kompetitor & Referensi

### 2.1 AI Gateway umum (routing multi-provider)

| Proyek | Lisensi | Bahasa/Stack | Kekuatan | Kelemahan |
|---|---|---|---|---|
| **LiteLLM** | MIT (core), enterprise berbayar untuk SSO/SCIM lanjutan | Python (proxy + SDK) | <cite index="4-1">Provider terluas, jalan ringan di VPS kecil (CPU-bound, cukup PostgreSQL kecil)</cite>, self-host paling matang | <cite index="5-1">Runtime Python melambat di beban berat</cite>; sempat ada insiden keamanan yang jadi pengingat pentingnya supply-chain security |
| **Portkey** | Gateway inti MIT/Apache 2.0, control plane berbayar | TypeScript | <cite index="2-1">Breadth provider luas + hosted governance UI</cite>, guardrails & MCP gateway bawaan | Fitur lanjutan (semantic caching, SSO, SCIM) terkunci di tier enterprise/control-plane; kini bagian dari Palo Alto Networks (Prisma AIRS) setelah akuisisi <cite index="9-1">yang selesai 29 Mei 2026</cite> — arah produk ke depan condong ke enterprise security |
| **Bifrost** | Open-source (Go) | Go | <cite index="5-1">Diklaim overhead sub-milidetik</cite> — cocok kalau target kalian adalah throughput tinggi & latency rendah | Klaim performa perlu diuji sendiri di traffic nyata |
| **Envoy AI Gateway** | Apache 2.0 | Envoy/Go | <cite index="5-1">Pilihan tepat untuk tim yang sudah pakai Kubernetes</cite> | Berat untuk tim kecil yang tidak butuh full Envoy/K8s stack |
| **AISIX** (dari tim Apache APISIX) | Apache-2.0 | — | <cite index="3-1">Data plane tetap di VPC sendiri, satu control plane untuk trafik API + LLM + agent, plus fitur ensemble model</cite> | Lebih ke arah enterprise data-residency |
| **OpenRouter** | Closed (SaaS) | — | <cite index="4-1">Zero-ops, tercepat untuk mulai, pay-per-token tanpa infra</cite> | Bukan self-host, tidak cocok kalau tujuan kalian "gratis & kontrol penuh" |
| **Cloudflare AI Gateway** | Managed (bagian Cloudflare) | — | <cite index="1-1">Edge caching global dan fitur inti gratis</cite> | <cite index="7-1">Hanya proxy (caching, rate-limit, analytics) — tidak ada unified model catalog/auto-routing</cite>, tidak self-host |

**Insight penting untuk proyek kalian:**
- <cite index="5-1">Kualitas gateway open-source dinilai dari: perilaku di bawah beban, respons saat provider down, cakupan lisensi, dan biaya operasional untuk menjalankannya</cite> — jadi 4 kriteria ini harus jadi checklist desain.
- <cite index="6-1">Insiden keamanan tahun 2024/2025 pada LiteLLM adalah pengingat bahwa gateway self-hosted hanya seaman seluruh rantai build & rilisnya</cite> — supply-chain security (dependency pinning, SBOM, automated CVE scan) wajib masuk desain sejak awal, bukan ditambahkan belakangan.
- Pola pasar yang jelas: **provider breadth vs self-host purity vs governance UI vs raw performance** — masing-masing pemain besar hanya unggul di 1-2 titik. Celah yang masih terbuka: gateway yang **ringan, gampang self-host, DAN punya UI/CLI/MCP yang enak dipakai, DAN secara native dirancang untuk pool key gratis/multi-akun** — kombinasi ini belum ada yang menggarap serius.

### 2.2 Proyek "key rotation" untuk provider gratis

Ini kategori terpisah yang relevan langsung dengan kebutuhan "menghandel berbagai free":

- **gemini-proxy** (lehuygiang28) — <cite index="13-1">proxy open-source untuk Gemini API dengan rotasi key, load balancing, tracking penggunaan per key, aktif/nonaktifkan key tanpa downtime, retry dengan exponential backoff, dukungan streaming, dan dashboard analitik — didesain untuk Cloudflare Workers/serverless</cite>. Ini paling dekat dengan cetak biru yang kalian mau, tapi cakupannya cuma Gemini.
- **LLM-API-Key-Proxy** (Mirrowel) — <cite index="16-1">gateway universal yang kompatibel dengan endpoint OpenAI dan Anthropic, mendukung rotasi key otomatis, failover saat error, penanganan rate-limit, dan cooldown cerdas; bisa dipakai Claude Code, Cursor, dsb</cite>. Kuat di sisi resilience-nya tapi tanpa Web UI penuh.
- **CLIProxyAPI** — <cite index="17-1">membungkus Gemini CLI menjadi API yang kompatibel OpenAI/Gemini/Claude, mendukung multi-account load balancing sehingga bisa memakai model gratis lewat CLI</cite>.
- **gemini-api-key-rotator-proxy-server** — <cite index="11-1">proxy lokal berbasis FastAPI khusus Gemini yang mendistribusikan beban antar banyak key gratis untuk melewati rate limit</cite>.
- **rotato** — <cite index="14-1">proxy Node.js zero-dependency yang merotasi key OpenAI, Gemini, Groq, OpenRouter dkk otomatis saat kena 429</cite>.

**Insight:** semua proyek di kategori ini adalah *tools kecil satu-tujuan* (rotator saja). Belum ada yang menggabungkan rotator + gateway multi-provider penuh + UI + CLI + MCP + easy-deploy dalam satu produk kohesif. **Ini adalah niche/positioning terbaik untuk proyek kalian.**

### 2.3 MCP Gateway

- <cite index="18-1">MCP gateway adalah reverse proxy untuk trafik Model Context Protocol antara agent AI dan server MCP, yang mengelola siklus hidup sesi, merutekan request ke backend yang tepat, menegakkan kebijakan keamanan, dan menyediakan observability — tanpa perlu mengubah kode agent atau server MCP</cite>.
- <cite index="21-1">MCP Gateway memecahkan masalah integrasi "N×M" antara banyak agent dan banyak tool</cite> — analog persis dengan masalah "banyak app x banyak provider LLM" yang dipecahkan AI gateway biasa.
- Peringatan keamanan serius: <cite index="22-1">lebih dari separuh server MCP yang terekspos ke internet berjalan tanpa kontrol akses yang berarti</cite>, jadi kalau proyek kalian menyediakan MCP server sebagai salah satu channel akses, **autentikasi dan scoping tool wajib default-on**, bukan opsional.
- <cite index="24-1">Enterprise MCP gateway modern mendukung flow terintegrasi SSO, permission scoping berbasis peran, dan kontrol akses per-tool</cite> — jadi meski kalian target "free/open-source", desain izin per-tool tetap penting untuk kredibilitas keamanan proyek.

### 2.4 Kesimpulan riset → Positioning proyek kalian

> **"LiteLLM-simplicity + gemini-proxy's free-key resilience + Portkey-style multi-channel UX (UI/CLI/MCP) — tapi ringan, satu binary/satu compose file, dan open-source penuh tanpa fitur terkunci di paywall."**

Diferensiator utama:
1. **Free-tier-native**: bukan cuma "support banyak provider", tapi didesain dari awal untuk *pool banyak API key gratis per provider* dengan quota tracking, cooldown, dan auto-fallback lintas provider (bukan cuma lintas key).
2. **Deploy di mana saja tanpa fork kode**: satu codebase → jalan sebagai Cloudflare Worker/Deno Deploy (serverless, gratis) *atau* Docker container di VPS sendiri.
3. **Semua channel akses setara**: UI, CLI, MCP server, REST API — bukan UI sebagai citizen kelas dua.
4. **Aman by default**: bukan fitur tambahan berbayar — enkripsi key, virtual key per user, rate-limit, audit log semuanya di free/open-source tier.

---

## 3. Fitur Inti (MVP → Advanced)

### Fase 1 — MVP (fondasi)
- [ ] Unified API: endpoint kompatibel `OpenAI Chat Completions` + `Anthropic Messages` (dua format ini paling banyak dipakai tools/SDK pihak ketiga).
- [ ] Provider adapter: OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, Cloudflare Workers AI, Ollama/local (minimal 6 provider di awal).
- [ ] Multi-key pool per provider + rotasi (round-robin & weighted random) + auto-skip key yang lagi cooldown/kena 429.
- [ ] Virtual API key (key yang dipakai user ke gateway kalian, terpisah dari key provider asli) + scoping model/provider per virtual key.
- [ ] Config via file (`config.yaml`) dan/atau environment variable — tanpa DB wajib untuk mode paling sederhana.
- [ ] Docker image single-container + `docker-compose.yml` siap pakai.
- [ ] Deploy target serverless pertama: Cloudflare Workers (karena gratis, edge, dan cocok untuk beban gateway yang I/O-bound).

### Fase 2 — Observability & Reliability
- [ ] Dashboard Web UI: daftar key & statusnya, usage per key/provider/model, biaya (estimasi walau $0 untuk free-tier), grafik request/latency/error.
- [ ] Retry + exponential backoff + circuit breaker per key.
- [ ] Fallback chain lintas provider (mis. Gemini habis → lempar ke Groq → lempar ke OpenRouter free model).
- [ ] Caching (exact-match dulu, semantic caching belakangan) untuk hemat kuota gratis.
- [ ] Structured logging (JSON) + endpoint `/metrics` (Prometheus-compatible).
- [ ] **Provider Registry Sync** — integrasi dengan registry terbuka (models.dev dkk) + health-check periodik + registry lokal `free-tier.json`, di-expose lewat Web UI/CLI/MCP/REST (detail: §10.3).

### Fase 3 — Multi-channel Access
- [ ] CLI (`aigw`) — kelola key, tes prompt cepat, lihat status kuota, generate virtual key, dari terminal.
- [ ] MCP Server bawaan — expose gateway kalian sebagai tool MCP (`chat_completion`, `list_models`, `check_quota`) supaya Claude Code/Claude Desktop/agent lain bisa langsung connect.
- [ ] SDK client resmi (JS/TS & Python) sebagai wrapper tipis di atas REST API.
- [ ] **(Opsional/eksperimental) Dukungan MCP Apps** — render UI interaktif (bukan cuma teks/JSON) langsung di dalam host MCP (Claude, ChatGPT, Cursor) untuk tool tertentu seperti katalog model & status key. Detail: §4.1.

### Fase 4 — Keamanan & Governance Lanjutan
- [ ] Enkripsi key provider at-rest (AES-256, key encryption key terpisah dari data).
- [ ] RBAC sederhana (admin/member/read-only) untuk Web UI & tim.
- [ ] Audit log immutable (siapa pakai key apa, kapan, ke provider mana).
- [ ] Guardrails dasar: PII redaction opsional, content moderation hook, prompt-injection heuristic untuk request yang lewat MCP.
- [ ] SSO opsional (OIDC) — tetap open-source, bukan dikunci di paywall seperti kompetitor.

### Fase 5 — Skalabilitas
- [ ] Mode terdistribusi: state key pool disimpan di Redis/KV (bukan in-memory) supaya bisa jalan multi-instance/multi-region.
- [ ] Helm chart untuk deploy Kubernetes bagi yang butuh self-host skala besar.
- [ ] Plugin system supaya komunitas bisa nambah provider adapter atau guardrail baru tanpa fork core.

---

## 4. Arsitektur

```
                         ┌───────────────────────────────────────┐
                         │              CLIENTS                  │
                         │  Web UI · CLI (aigw) · MCP Client      │
                         │  (Claude Desktop/Code) · SDK · curl    │
                         └───────────────────┬─────────────────---┘
                                              │  HTTPS (virtual API key)
                         ┌────────────────────▼────────────────────┐
                         │            EDGE / ENTRY LAYER            │
                         │  - Auth middleware (virtual key → scope) │
                         │  - Rate limiter (per key/IP)             │
                         │  - Request validation & guardrail hook   │
                         └────────────────────┬────────────────────┘
                                              │
                         ┌────────────────────▼────────────────────┐
                         │              ROUTING CORE                │
                         │  - Model/provider resolver                │
                         │  - Load balancer (round-robin/weighted)   │
                         │  - Key pool manager (status, cooldown)    │
                         │  - Fallback chain executor                │
                         │  - Cache layer (exact/semantic)           │
                         └───┬──────────┬──────────┬──────────┬─────┘
                             │          │          │          │
                        ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼────┐
                        │ OpenAI │ │ Gemini │ │  Groq  │ │  ...N   │
                        │adapter │ │adapter │ │adapter │ │adapters │
                        └────────┘ └────────┘ └────────┘ └─────────┘

                         ┌───────────────────────────────────────┐
                         │         STATE & OBSERVABILITY          │
                         │  KV/Redis (key status, rate counters)  │
                         │  Postgres/SQLite (usage, audit log)    │
                         │  Metrics exporter (Prometheus)         │
                         └───────────────────────────────────────┘

                         ┌───────────────────────────────────────┐
                         │           MCP SERVER LAYER             │
                         │  Bungkus routing core sebagai tool MCP │
                         │  (streamable HTTP transport)           │
                         └───────────────────────────────────────┘
```

Prinsip desain:
- **Routing Core adalah satu-satunya sumber kebenaran** — Web UI, CLI, dan MCP server semuanya cuma "front" tipis yang manggil Routing Core lewat API internal yang sama. Ini yang bikin "multi-channel" tidak jadi 3x maintenance.
- **Stateless di lapisan HTTP, state di KV/DB** — supaya bisa jalan di serverless (yang stateless secara natural) maupun self-host multi-instance.
- **Provider adapter sebagai plugin terisolasi** — tiap adapter cuma tahu cara translate request/response ke format provider-nya; menambah provider baru = menambah 1 file, tidak menyentuh core.

### 4.1 Dukungan MCP Apps (UI interaktif di dalam host MCP)

**MCP Apps** (SEP-1865) adalah ekstensi resmi MCP — <cite index="43-1">memungkinkan server MCP mengirim UI interaktif ke host lewat skema URI `ui://`, diasosiasikan ke tool lewat metadata, dengan komunikasi dua arah antara UI dan host memakai JSON-RPC dasar MCP</cite> — <cite index="45-1">resmi final di spesifikasi 2026-07-28 (dipublikasikan 28 Juli 2026)</cite>, jadi masih sangat baru.

**Cara kerja singkat:** <cite index="44-1">tool mendeklarasikan template UI-nya lebih dulu supaya host bisa prefetch, cache, dan review keamanan sebelum apapun dijalankan; UI dirender di sandboxed iframe, dan setiap aksi dari UI melewati jalur audit & consent yang sama seperti pemanggilan tool langsung</cite>. <cite index="45-1">Method-nya campuran — sebagian sama dengan MCP inti (`tools/call`, `resources/read`), sebagian berprefix `ui/` (`ui/open-link`, `ui/message`, `ui/update-model-context`)</cite> — sehingga UI bisa mengirim balik input ke percakapan atau diam-diam sinkron konteks ke LLM.

**Status desain proyek ini**: rancangan MCP Server Layer di atas (§4 diagram) saat ini hanya expose tools berbasis teks/JSON, **belum** mendukung MCP Apps. Ini fitur opsional yang bisa ditambahkan setelah MCP server dasar stabil (lihat §12.1 step 10), bukan bagian dari MVP.

**Rekomendasi implementasi kalau ditambahkan:**
1. **Reuse komponen React yang sama dengan Web UI** — bukan bikin UI kedua dari nol. Komponen seperti `ModelCatalogTable` atau `KeyStatusPanel` di-bundle jadi standalone HTML/JS kecil yang di-serve lewat resource `ui://`, sementara Web UI penuh tetap pakai App React yang sama untuk akses browser biasa. <cite index="45-1">Starter template resmi tersedia untuk React</cite>, jadi selaras dengan stack di §5.
2. **Asosiasikan tool → UI resource lewat metadata**, sesuai pola spec — misalnya tool `list_free_models` (§10.3) dipetakan ke `ui://catalog/free-models` supaya host tahu ada tampilan tabel interaktif yang bisa dirender, bukan cuma daftar teks.
3. **Graceful degradation wajib** — karena tidak semua host MCP mendukung ekstensi ini (masih baru), tool tetap harus balikin representasi teks/JSON yang berguna kalau host tidak render `ui://`. UI Apps adalah *enhancement*, bukan satu-satunya jalur hasil.
4. **Lapisan keamanan tambahan** (menambah §8, bukan menggantikan): sanitasi ketat konten yang dikirim ke resource `ui://`, CSP ketat di iframe, dan audit setiap aksi `ui/message`/`ui/update-model-context` sama seperti audit tool-call biasa — karena ini merender HTML yang berasal dari server kalian di dalam host pihak lain.

### 4.2 Single-Tenant vs Multi-Tenant — Keputusan Eksplisit Sejak Awal

**Prinsip:** desain multi-tenant sejak awal skema data, tapi deploy sebagai single-tenant secara default. Bukan dua versi kode terpisah — satu skema yang "siap" multi-tenant, dengan mode single-user sebagai kasus khusus yang tersembunyi dari UI. Skema tabel lengkap (kolom `tenant_id` di tiap tabel relevan sejak hari pertama) ada di §9.1; setup wizard yang otomatis membuat tenant default ada di §7.3; dampaknya ke urutan pembangunan ada di §12.1 (Step 2).

**Aturan auth yang sama di kedua mode:** virtual key selalu di-*lookup* ke database untuk menentukan `tenant_id`-nya — **tidak pernah** diterima mentah dari header/parameter yang dikirim klien. Ini mencegah user menyamar sebagai tenant lain lewat header yang dimanipulasi. Kode auth-nya identik di single-tenant maupun multi-tenant; bedanya cuma jumlah tenant di database.

**Dua model pool key** (penting untuk proyek free-tier pooling):

| Model | Cara kerja | Cocok untuk |
|---|---|---|
| **A — Shared pool** | Satu admin menambah key gratis sekali (`scope: shared`), banyak tenant berbagi pool dengan kuota harian masing-masing (§6, item 5) | Gateway dijalankan untuk tim/komunitas kecil |
| **B — BYOK terisolasi** | Tiap tenant memasukkan key sendiri (`scope: personal`), hanya dipakai untuk tenant tersebut, tidak dicampur | Gateway dijalankan sebagai layanan untuk orang lain |

Single-user otomatis adalah kasus khusus Model B dengan satu tenant — jadi kalau `scope` sudah didesain sejak awal, single-user kompatibel tanpa kode tambahan.

**Feature flag, bukan fork kode:**

```
MULTI_TENANT_MODE=off   (default)
```

- `off`: alur invite user, RBAC granular, dan panel admin tenant disembunyikan dari UI. Hanya ada satu user (Owner) terikat ke tenant default.
- `on`: membuka alur invite, pilihan buat/join tenant, dan panel admin multi-tenant.

Toggle ini **tidak mengubah skema database maupun kode routing/rate-limit** — cuma menyalakan/mematikan bagian UI dan endpoint admin. Migrasi single-user → multi-tenant jadi cukup ganti env var, tanpa migrasi data.

---

## 5. Rekomendasi Stack Teknologi

Pertimbangan utama: **harus jalan enak di serverless (edge runtime) DAN self-host**, dan tim harus bisa maintain dengan effort wajar.

| Layer | Rekomendasi | Alasan |
|---|---|---|
| **Bahasa/runtime core** | **TypeScript** di atas runtime Web Standard (`fetch`, `Request`/`Response`) | Satu kode jalan di Cloudflare Workers, Deno Deploy, Vercel Edge, Node.js/Bun untuk self-host — tanpa perlu ganti bahasa. Ini alasan performa `Bifrost` (Go) atau `LiteLLM` (Python) kalah fleksibel untuk target "serverless-first" kalian. |
| **Web framework** | **Hono** | Framework HTTP paling ringan yang eksplisit didesain multi-runtime (Workers, Deno, Bun, Node) dengan API mirip Express — pas untuk gateway yang harus portable. |
| **Validasi schema** | **Zod** | Validasi request/response provider adapter, sekaligus infer TypeScript types otomatis. |
| **Storage state cepat (key pool, rate-limit counter, cache)** | **Cloudflare KV/Durable Objects** (mode serverless) atau **Redis/Valkey** (mode self-host) di belakang interface storage yang sama | Interface abstrak (`KVStore`) dengan 2 implementasi — bikin kode core tidak peduli platform. |
| **Storage relasional (usage log, audit, config user)** | **SQLite** (mode self-host ringan, via `libsql`/Turso) atau **Postgres** (self-host skala besar) | SQLite bikin onboarding "1 file, 0 dependency eksternal" mungkin; Postgres untuk yang butuh skala. Pakai ORM yang support keduanya (Drizzle ORM). |
| **ORM** | **Drizzle ORM** | Ringan, type-safe, resmi mendukung SQLite & Postgres & edge runtime — tidak seberat Prisma di edge. |
| **Autentikasi Web UI** | **Better Auth** atau **Lucia**-style session, plus opsi OIDC | Open-source, tidak vendor-locked, gampang self-host. |
| **Web UI** | **React + Vite**, komponen **shadcn/ui**, styling **Tailwind** | Ekosistem paling matang, gampang di-embed sebagai static asset yang di-serve dari Worker/Node yang sama (tanpa perlu hosting terpisah). |
| **CLI** | **TypeScript + `commander`/`clipanion`**, dibundle jadi binary via **Bun compile** atau npm package | Bisa dipakai lewat `npx aigw` tanpa install, atau jadi single binary untuk yang mau zero-dependency. |
| **MCP Server** | **`@modelcontextprotocol/sdk`** (TypeScript resmi) dengan transport **Streamable HTTP** | Standar resmi Anthropic, paling banyak didukung client (Claude Desktop, Claude Code, dll). |
| **Container** | **Docker** multi-stage build, image dasar `node:alpine` atau `oven/bun:alpine` | Image kecil, cepat pull, cocok untuk VPS spek rendah. |
| **Deploy serverless** | **Cloudflare Workers** (utama, karena gratisan generous + edge global), plus target sekunder **Deno Deploy**/**Vercel Edge** | <cite index="1-1">Cloudflare punya reputasi caching edge global dan fitur inti gratis</cite> — cocok untuk positioning "free". |
| **Observability** | **OpenTelemetry** untuk trace, expose **`/metrics`** format Prometheus, integrasi opsional ke **Langfuse** (open-source LLM observability) | Standar terbuka, tidak memaksa user pakai SaaS observability tertentu. |
| **CI/CD & supply chain security** | GitHub Actions + **Dependabot/Renovate**, **CodeQL**, **SBOM** (via `syft`), **`npm audit`/`osv-scanner`** wajib di pipeline | Merespons langsung pelajaran dari <cite index="5-1">insiden LiteLLM 2026 yang menunjukkan gateway self-hosted hanya seaman rantai build & rilisnya</cite>. |

**Kenapa bukan Go/Python seperti Bifrost/LiteLLM?** Go (Bifrost) unggul di performa mentah, Python (LiteLLM) unggul di ekosistem AI/ML dan kemudahan kontribusi komunitas data-science. Tapi **TypeScript adalah satu-satunya bahasa yang runtime-nya native di semua platform serverless populer (Workers/Deno/Vercel) sekaligus punya ekosistem Node yang matang untuk self-host** — trade-off performa mentah sepadan dengan portabilitas deploy yang jadi diferensiator utama proyek kalian.

---

## 6. Strategi "Menghandel Berbagai Free" (Multi-key & Multi-provider Free Tier)

Ini bagian paling khas dari kebutuhan kalian, berdasarkan pola yang dipakai proyek-proyek rotator di riset §2.2:

1. **Key Pool per Provider**
   - Satu provider bisa punya banyak key (mis. 5 akun Gemini gratis).
   - Tiap key punya metadata: status (`active`/`cooldown`/`exhausted`/`disabled`), request terakhir, error terakhir, estimasi sisa kuota (kalau provider expose info ini di header response).

2. **Strategi seleksi key**
   - **Round-robin** untuk pemakaian merata.
   - **Weighted random** untuk distribusi tak-terprediksi (menghindari pola yang gampang di-throttle provider).
   - **Sticky-until-error**: pertahankan 1 key sampai gagal, baru pindah — bagus untuk kasus yang butuh konsistensi sesi.

3. **Auto cooldown & recovery (MVP: reaktif)**
   - Saat provider balas 429/`RESOURCE_EXHAUSTED`, key masuk `cooldown` dengan durasi mengikuti header `Retry-After` bila ada, atau exponential backoff default.
   - Health-check periodik (background job) mencoba key yang `cooldown` dengan request murah (mis. `list models`) sebelum dikembalikan ke pool `active`.
   - **Keterbatasan**: pendekatan ini murni reaktif — baru masuk cooldown *setelah* menerima 429, jadi selalu ada minimal satu request yang "terbuang" sebelum sistem sadar limit sudah tercapai. Evolusi ke ledger proaktif berbasis token dijelaskan di §6.4.3 (roadmap Fase 5, §11).

4. **Fallback lintas provider, bukan cuma lintas key**
   - Definisikan **model alias** (mis. `"fast-free"` → coba Groq → gagal → Gemini Flash → gagal → OpenRouter free model). User/app cuma perlu tahu alias-nya, gateway yang urus sisanya.
   - Aturan fallback selengkapnya (batasan per-family, dan bedanya dengan konsep "unified model") ada di §6.4.1. Kalau model yang sama tersedia di banyak provider sekaligus, lihat juga §10.3.1 (Unified Model).

5. **Quota budgeting**
   - Tiap virtual key (user) bisa dikasih limit harian request supaya 1 user tidak menghabiskan seluruh pool key gratis sendirian — penting karena kalian menyediakan gateway ini untuk banyak pemakai.

6. **Transparansi ke user**
   - Endpoint `/status` atau perintah CLI `aigw status` menunjukkan kondisi tiap key & provider secara real-time — supaya user tahu kenapa response lambat/gagal, bukan black-box.

### 6.4 Fallback Lintas Provider — Detail Tambahan

Empat sub-bagian di bawah ini memperdalam item 4 (fallback) di atas: bagaimana mencegah fallback merusak kualitas/data diam-diam, bagaimana menjaga kontinuitas percakapan saat provider berpindah, arah evolusi rate-limiting ke proaktif, dan apa yang terjadi kalau seluruh fallback chain gagal.

#### 6.4.1 Model-Equivalence & Family (mencegah penurunan kualitas diam-diam)

Fallback yang asal lempar ke provider lain berisiko mengalihkan request dari model besar ke model kecil yang jauh lebih lemah tanpa disadari user — kualitas jawaban turun diam-diam.

**Kasus khusus embeddings (kritis):** untuk endpoint embeddings, fallback **tidak boleh** lintas-model sama sekali. Vector dari model berbeda hidup di ruang dimensi yang tidak kompatibel — kalau gateway diam-diam mengalihkan ke model embedding lain saat model utama kena limit, vector store yang dibangun di atas gateway ini bisa korup tanpa peringatan apa pun ke user.

Rekomendasi desain:
- Definisikan konsep **"family"**: satu identitas model + dimensi vektor (untuk embeddings) atau kelas kapabilitas (untuk chat/completion).
- Fallback hanya boleh berpindah **di dalam family yang sama** — bukan ke family lain, kecuali user secara eksplisit mengizinkan lewat konfigurasi model alias.
- Untuk chat/completion, model alias (mis. `"fast-free"`) boleh berisi campuran kelas model, tapi harus dengan persetujuan eksplisit user lewat konfigurasi — bukan default behavior.
- Tandai di dokumentasi/response header (mis. `X-Model-Family`) supaya user tahu family model mana yang sebenarnya memproses request.

> Lihat §10.3.1 untuk perbedaan konsep "family" ini dengan "unified model".

#### 6.4.2 Context Handoff Saat Fallover di Tengah Percakapan

Kalau percakapan multi-turn pindah provider di tengah jalan (karena kuota habis), model baru tidak tahu ia melanjutkan tugas model sebelumnya. Berisiko menyebabkan halusinasi, pengulangan pertanyaan yang sudah dijawab, atau kehilangan konteks task yang sedang dikerjakan.

Solusinya: sisipkan satu pesan sistem ringkas ke request yang dialihkan, menjelaskan konteks perpindahan — misalnya menyebutkan model sebelumnya, model baru, alasan perpindahan (kuota habis), dan instruksi eksplisit untuk melanjutkan tugas tanpa mengulang dari awal.

Detail implementasi:
- Opsional/toggle, bukan default paksa — beberapa use case lebih baik tanpa suntikan pesan tambahan.
- Hanya disisipkan saat model benar-benar berubah untuk sesi yang sama — bukan di request pertama, bukan di kelanjutan dengan model yang sama.
- Sesi dilacak lewat header sesi eksplisit (mis. `X-Session-Id`) atau hash dari pesan pertama percakapan sebagai fallback.
- State sesi cukup di memori dengan TTL beberapa jam — tidak perlu persisten, karena tujuannya cuma menjaga kontinuitas jangka pendek.

#### 6.4.3 Rate Limiting Proaktif Berbasis Token (Roadmap Fase 5)

MVP cukup reaktif (§6.3), tapi arah jangka panjangnya adalah ledger yang "belajar":

- Lacak counter RPM/RPD/TPM/TPD per `(tenant_id, provider, model, key_id)` — bukan cuma status aktif/cooldown biner.
- Kalau provider mengembalikan limit sebenarnya lewat isi error atau header response, ledger otomatis memperketat batasnya sendiri untuk key tersebut — tanpa perlu hardcode angka di konfigurasi.
- Router memilih provider berdasarkan **sisa kuota di ledger** terlebih dulu (proaktif), baru fallback ke deteksi 429 (reaktif) sebagai jaring pengaman kalau ledger meleset atau provider mengubah kebijakan mendadak.
- Lacak token secara terpisah untuk prompt dan output, bukan cuma jumlah *request* — satu prompt raksasa tetap terhitung satu request kalau dibatasi per-request saja, padahal beban komputasi sesungguhnya sebanding dengan token.

#### 6.4.4 UX Saat Semua Provider Gagal (Hard Failure)

Kalau seluruh fallback chain sudah dicoba dan semuanya gagal (kuota habis di semua provider, atau semua down bersamaan), respons ke user harus terstruktur, bukan 503 generik tanpa konteks:

```json
{
  "error": {
    "code": "all_providers_exhausted",
    "message": "Semua 4 provider di fallback chain gagal.",
    "attempts": [
      { "provider": "groq", "model": "llama-3.3-70b", "reason": "rate_limited", "retry_after_s": 1200 },
      { "provider": "gemini", "model": "2.5-flash", "reason": "rate_limited", "retry_after_s": 3600 },
      { "provider": "openrouter", "model": "deepseek-free", "reason": "provider_down" }
    ],
    "next_available_at": "2026-08-07T18:00:00Z"
  }
}
```

Ini konsisten dengan prinsip transparansi yang sudah ada di item 6 di atas (endpoint `/status`) — user/developer yang mengintegrasikan gateway ini bisa tahu persis apa yang terjadi dan kapan sebaiknya mencoba lagi, alih-alih menerka dari kode status HTTP generik.

---

## 7. Model Deployment

### 7.1 Serverless (default, gratis)
- Cloudflare Workers: `wrangler deploy`, state di KV + Durable Objects, biaya $0 di tier gratis untuk traffic wajar.
- Web UI di-build jadi static assets, di-serve lewat Cloudflare Pages/Workers Assets — satu domain, tanpa server terpisah.
- Onboarding: tombol **"Deploy to Cloudflare"** yang otomatis fork repo + set secrets lewat `wrangler secret`.

### 7.2 Self-host
- `docker compose up -d` — satu file compose berisi: gateway container + (opsional) Redis + (opsional) Postgres. Default pakai SQLite embedded supaya bisa jalan tanpa dependency eksternal sama sekali untuk yang mau paling simpel.
- Helm chart untuk yang mau di Kubernetes (fase belakangan).
- Environment variable atau `config.yaml` untuk daftar provider & key — mendukung **hot-reload** config tanpa restart (watch file/`SIGHUP`).

### 7.3 Setup wizard
- Saat pertama kali dijalankan (baik serverless maupun self-host) dan belum ada admin, gateway otomatis membuka mode setup: buat akun admin, tambah provider pertama, generate virtual key pertama — semuanya lewat Web UI, tanpa perlu edit file manual (walau tetap didukung untuk power user).
- Di belakang layar, wizard otomatis membuat `tenant_id = "default"` (lihat §4.2) — user single-tenant tidak pernah melihat konsep "tenant" di UI, mereka cuma lihat "akun saya", "key saya".

---

## 8. Keamanan (Security by Default)

| Ancaman | Mitigasi |
|---|---|
| Key provider bocor dari database/config | Enkripsi at-rest (AES-256-GCM), key-encryption-key disimpan terpisah (env var/secret manager), tidak pernah di-log utuh (mask jadi `sk-...ab12`). |
| Virtual key dipakai berlebihan/disalahgunakan | Rate-limit per virtual key + per IP, quota harian, revoke instan lewat UI/CLI. |
| Supply-chain attack (dependency jahat) | Lockfile wajib di-commit, automated CVE scan di CI, pin versi minor, review manual untuk major bump dependency inti. |
| MCP server diakses tanpa otorisasi | <cite index="22-1">Karena lebih dari separuh server MCP publik tidak punya kontrol akses berarti</cite>, MCP server bawaan proyek ini **wajib** butuh token/virtual key untuk connect — tidak ada mode "open" tanpa auth, bahkan untuk dev lokal defaultnya tetap minta token (bisa di-disable eksplisit hanya untuk localhost). |
| Prompt injection lewat konten yang diproses tool MCP | Scoping tool per virtual key (tool apa saja yang boleh dipanggil), audit log tiap tool-call, opsi guardrail heuristic sebelum eksekusi. |
| Man-in-the-middle / traffic sniffing | HTTPS wajib (redirect otomatis di self-host via Caddy/embedded TLS; otomatis di serverless), HSTS header default. |
| Kebocoran lewat log/observability | Redact field sensitif (API key, isi PII opsional) sebelum masuk log/metrics exporter. |
| Kehilangan state key pool (database hilang, terutama storage ephemeral tanpa persistent volume) | Snapshot database terenkripsi berkala (interval bisa dikonfigurasi) ke lokasi lokal/target HTTP eksternal dengan token akses terpisah dari kunci enkripsi utama; saat startup, kalau database utama tidak ditemukan, otomatis restore dari backup terakhir sebelum migrasi/inisialisasi berjalan. Kunci enkripsi backup boleh sama dengan kunci utama, tapi sebaiknya dikonfigurasi terpisah supaya operator bisa rotasi kunci tanpa mengganggu snapshot lama. |

---

## 9. Struktur Repository (usulan)

```
free-ai-gateway/
├── packages/
│   ├── core/            # Routing core, key pool manager, provider adapters
│   ├── server/           # Hono app (HTTP entry), dipakai serverless & self-host
│   ├── mcp-server/        # MCP server yang wrap core
│   ├── cli/               # CLI (aigw)
│   ├── web/               # React dashboard
│   └── sdk-js/             # Client SDK ringan
├── adapters/
│   ├── openai/
│   ├── anthropic/
│   ├── gemini/
│   ├── groq/
│   ├── openrouter/
│   └── ...
├── deploy/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── wrangler.toml       # Cloudflare Workers
│   └── helm/
├── docs/
└── examples/
```

Monorepo (pnpm workspaces + Turborepo) supaya `core` dipakai bersama oleh `server`, `mcp-server`, dan `cli` tanpa duplikasi logika. [Catatan: keputusan package manager berubah ke Bun, lihat `docs/adr/0005-bun-atas-pnpm-node.md` — baris ini sengaja tidak dihapus, dibiarkan sebagai jejak keputusan awal.]

### 9.1 Skema Data Inti (tenant-ready sejak hari pertama)

Mengikuti prinsip di §4.2: desain multi-tenant sejak skema data, deploy sebagai single-tenant secara default. Kolom `tenant_id` ada di setiap tabel relevan sejak hari pertama, bukan ditambahkan belakangan — menambahnya setelah ada data produksi jauh lebih menyakitkan daripada memasukkannya sejak skema pertama, walau nilainya cuma satu konstanta di awal.

```
tenants:        id, name, created_at
users:          id, tenant_id, email, role
virtual_keys:   id, tenant_id, key_hash, scopes
provider_keys:  id, tenant_id, provider, encrypted_key, scope (personal|shared)
rate_ledger:    tenant_id, provider, model, key_id, rpm, rpd, tpm, tpd
```

---

## 10. Daftar Provider "Gratis" Saat Ini, Link Resmi, & Model yang Tersedia

Bagian ini menjawab kebutuhan konkret: dari mana gateway (dan tim kalian) tahu **provider mana yang masih gratis, link resminya, dan model apa saja yang tersedia gratis** — karena seperti dicatat riset, <cite index="29-1">free tier bisa berubah diam-diam (salah satu provider bahkan menghapus sebagian besar model gratisnya pada 31 Mei 2026 tanpa pemberitahuan)</cite>, jadi info ini **tidak boleh di-hardcode permanen**, harus ada mekanisme cek berkala.

### 10.1 Snapshot provider gratis (per pertengahan 2026 — akan berubah, lihat §10.3 untuk cara verifikasi live)

| Provider | Link resmi (daftar/API key) | Model gratis saat ini | Batas free tier |
|---|---|---|---|
| **Google AI Studio / Gemini API** | https://aistudio.google.com/ | <cite index="27-1">Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, dan model preview 3.x Flash yang lebih baru (Gemini 2.0 sudah dipensiunkan Juni 2026)</cite> | <cite index="31-1">~1.500 request/hari, tanpa kartu kredit, tanpa expiry</cite> |
| **Groq** | https://console.groq.com/ | Llama 3.3 70B, dan model open-weight lain di katalog Groq | <cite index="32-1">Menurut tabel resmi Groq: llama-3.3-70b-versatile dapat 30 RPM, 1.000 RPD, 12K TPM, 100K TPD</cite> (jangan pakai angka lama 1.500 RPD yang sudah tidak berlaku) |
| **Cerebras** | https://cloud.cerebras.ai/ | Llama 3.3 70B dan model open-weight lain di infrastruktur wafer-scale mereka | <cite index="27-1">Cerebras memimpin dari sisi volume harian mentah — 1 juta token/hari tanpa kartu kredit</cite> |
| **OpenRouter** | https://openrouter.ai/models?max_price=0 (filter model gratis) | <cite index="28-1">25+ model gratis termasuk varian Llama, Mixtral, dan DeepSeek</cite> lewat satu API key | Rate limit per model bervariasi, umumnya beberapa puluh request/menit |
| **GitHub Models** | https://github.com/marketplace/models | <cite index="30-1">Campuran model (OpenAI, Llama, dan lainnya) gratis untuk keperluan development dalam batas rate limit</cite> | Terikat akun GitHub, limit harian per model |
| **Cloudflare Workers AI** | https://developers.cloudflare.com/workers-ai/ | Kumpulan model open-weight yang dihost Cloudflare (Llama, Mistral, dll) | Kuota harian gratis (neuron-based), cocok untuk beban ringan di edge |
| **Mistral AI (La Plateforme)** | https://console.mistral.ai/ | Model Mistral kelas kecil-menengah di tier developer | <cite index="28-1">Punya tier developer gratis</cite>, cek dashboard untuk limit terkini |
| **NVIDIA NIM** | https://build.nvidia.com/ | Berbagai model open-weight (Llama, Mistral, dll) lewat NIM API | <cite index="28-1">Tanpa kartu kredit untuk mulai</cite> |
| **Hugging Face Inference API** | https://huggingface.co/inference-api | <cite index="28-1">Ribuan model tersedia gratis</cite> | Rate limit ketat untuk akun gratis, cold-start model kadang lambat |
| **Cohere** | https://dashboard.cohere.com/ | Model Command seri terbaru di trial key | Trial key dengan kuota terbatas per bulan |

> ⚠️ **Catatan penting**: <cite index="30-1">"gratis" hampir selalu berarti data prompt kalian dipakai untuk training oleh provider — jadi jangan pakai tier gratis untuk data produksi/pelanggan yang sensitif</cite>; anggap biaya tier berbayar sebagai "biaya privasi" juga, bukan cuma biaya compute. Ini perlu ditulis eksplisit di dokumentasi/README proyek supaya user gateway tidak salah pakai.

### 10.2 Kenapa tabel di atas *tidak boleh* jadi satu-satunya sumber

Tiga sumber riset independen (§2 & pencarian di atas) sepakat: free tier berubah **bulanan**, kadang **tanpa pengumuman**. Contoh nyata dari riset: <cite index="29-1">pada 31 Mei 2026 salah satu provider diam-diam menghapus sebagian besar model gratisnya termasuk model yang sedang dipakai di produksi orang lain, dan tidak ada pemberitahuan — hanya scanner otomatis yang bisa mendeteksinya</cite>. Karena itu tabel manual seperti di atas **wajib hanya jadi starting point**, bukan sumber kebenaran gateway saat runtime.

### 10.3 Mekanisme "cara mendapatkan info ini" di dalam gateway (rekomendasi desain)

Tambahkan komponen baru ke arsitektur (§4): **Provider Registry Sync**.

1. **Registry terbuka sebagai sumber utama** — integrasikan dengan proyek registry open-source yang sudah ada dan aktif di-maintain komunitas, bukan bikin dari nol:
   - **models.dev** — <cite index="33-1">database open-source untuk spesifikasi model AI, harga, dan fitur, bisa diakses lewat endpoint JSON per-provider, model-agnostic, atau katalog gabungan</cite>. <cite index="35-1">Data disimpan sebagai file TOML per provider/model di repo GitHub-nya, dan mereka secara eksplisit mengundang kontribusi komunitas untuk menjaga data tetap update</cite> — proyek kalian bisa jadi kontributor sekaligus konsumen data ini.
   - **llm-prices** (simonw) — <cite index="36-1">data harga tersimpan sebagai file JSON per vendor dengan riwayat harga (price_history) lengkap tanggal berlaku, jadi bisa dilacak kapan sebuah harga/model berubah</cite>.
   - **genai-prices** (pydantic) — <cite index="38-1">library untuk menghitung harga panggilan API LLM dengan pencocokan model/provider yang canggih, mendukung harga historis, harga harian yang berubah-ubah (mis. DeepSeek), dan pricing bertingkat untuk context besar (mis. Gemini)</cite> — bisa dipakai sebagai *dependency* langsung, bukan cuma referensi.
2. **Registry lokal proyek** (`registry/free-tier.json` di repo kalian) — file yang dikurasi manual khusus untuk kolom yang tidak ada di registry umum di atas: apakah butuh kartu kredit, apakah request tanpa auth diperbolehkan untuk cek status, dsb. Diperbarui via PR komunitas + review berkala (mis. tiap awal bulan), sama seperti pola `models.dev`.
3. **Health-check runtime** (bukan cuma baca dari file statis) — sebelum gateway benar-benar mempercayai sebuah model "gratis dan tersedia", job background memanggil endpoint `list models` resmi tiap provider secara periodik (mis. tiap 6 jam) dan membandingkan dengan registry lokal → kalau model hilang dari response resmi, otomatis nonaktifkan dari pool dan catat di log/alert. Ini yang mencegah insiden seperti kasus "model dihapus diam-diam 31 Mei 2026" di atas terulang tanpa terdeteksi.
4. **Expose lewat channel yang sudah ada** — hasil registry sync ini ditampilkan lewat:
   - Web UI: halaman "Model Catalog" dengan filter "gratis saja", status live (aktif/terhapus/berubah), dan link langsung ke halaman signup provider.
   - CLI: `aigw providers list --free` dan `aigw models list --free`.
   - MCP tool: `list_free_models` supaya agent (Claude Code dkk) bisa query langsung "model gratis apa yang bisa dipakai sekarang" saat runtime, tanpa developer harus cek manual.
   - REST API: `GET /v1/catalog?free=true` yang datanya berasal dari gabungan registry eksternal (models.dev dkk) + hasil health-check internal.

Dengan pola ini, proyek kalian **tidak perlu jadi sumber kebenaran sendiri** untuk data yang berubah-ubah — cukup jadi *agregator + validator real-time* di atas registry komunitas yang sudah ada, ditambah lapisan health-check sendiri khusus untuk pool key yang dipakai user gateway kalian.

### 10.3.1 Unified Model — Model Sama yang Disajikan Banyak Provider

Kalau model yang identik (misal Llama 3.3 70B) tersedia sekaligus di Groq, Cerebras, dan OpenRouter, pertanyaannya: digabung jadi satu entri logis di katalog, atau dianggap 3 model terpisah yang harus dipilih manual user?

- Tambahkan konsep **"unified model"**: satu nama logis yang memetakan ke beberapa provider/endpoint fisik. Kolom `unified_model_id` di `registry/free-tier.json` memetakan banyak entri provider ke satu grup logis ini.
- Failover berjalan **di dalam grup** ini secara otomatis dengan urutan prioritas (mis. berdasarkan kecepatan atau keandalan historis).
- Sediakan mekanisme override manual (merge/split) untuk kasus di mana pengelompokan otomatis salah tebak — misalnya dua model yang namanya mirip tapi sebenarnya versi fine-tune yang berbeda.

> **Jangan disamakan dengan "family" (§6.4.1)**: *unified model* menyatukan model yang sama lintas provider (buat memperluas pilihan). *Family* membatasi fallback supaya tidak lintas kelas kapabilitas/dimensi vektor (buat mencegah penurunan kualitas diam-diam). Satu unified model bisa saja berisi beberapa varian family kalau provider menyajikan versi kuantisasi yang berbeda — keduanya beroperasi di level yang berbeda dan saling melengkapi, bukan sinonim.

---

## 11. Roadmap Ringkas

| Fase | Target | Estimasi |
|---|---|---|
| 1. MVP | Gateway single-provider-set, docker-compose, deploy Cloudflare, config file | 3–4 minggu |
| 2. Reliability | Multi-key rotation, fallback, caching, dashboard dasar | 3–4 minggu |
| 3. Multi-channel | CLI, MCP server, SDK | 2–3 minggu |
| 4. Security & Governance | Enkripsi, RBAC, audit log, guardrail dasar | 2–3 minggu |
| 5. Scale | Redis/KV terdistribusi, Helm chart, plugin system, **rate limiting proaktif berbasis ledger token** (lihat §6.3) | Berkelanjutan |

---

## 12. Metodologi Pengembangan

Bagian ini menjawab pertanyaan praktis: **dengan urutan langkah seperti apa** proyek ini sebaiknya dibangun (dari nol sampai fitur lengkap), dan **bagaimana bekerja secara efektif dengan AI coding assistant** (mis. Claude Code) supaya hasilnya tidak sekadar "jalan", tapi juga aman dan mudah diperluas.

### 12.1 Walking Skeleton — urutan pembangunan teknis

Berbeda dari Roadmap per-fase di §11 (yang mengelompokkan *fitur*), ini adalah urutan *unit kerja teknis* dari yang paling sederhana, di mana tiap step menghasilkan sesuatu yang benar-benar bisa dites/dipakai sebelum lanjut ke step berikutnya (pola **walking skeleton** — istilah dari *Growing Object-Oriented Software, Guided by Tests*, Freeman & Pryce).

| Step | Yang dibangun | Kenapa di urutan ini |
|---|---|---|
| 0 | Single-file proxy: 1 provider, 1 key, forward apa adanya | Validasi jalur end-to-end (termasuk streaming) sebelum tambah kompleksitas |
| 1 | Provider kedua + kontrak `ProviderAdapter` | Baru dengan 2 provider terlihat mana yang generic vs spesifik |
| 2 | Virtual API key (key gateway ≠ key provider asli) **+ kolom `tenant_id` di skema sejak awal** (§4.2, §9) — walau nilainya cuma satu konstanta `"default"` di mode single-user | Fondasi keamanan — semua step berikutnya bergantung pada asumsi ini. Menambah `tenant_id` setelah Step 5–6 (persist state) berarti migrasi skema data yang sudah berjalan — bertentangan dengan filosofi walking skeleton |
| 3 | Multi-key per provider + rotasi round-robin | Baru masuk "handle banyak free tier"; ditunda sampai fondasi adapter+virtual-key solid |
| 4 | Deteksi 429 + cooldown (in-memory) | Level self-host single instance |
| 5 | Persist state ke SQLite/KV | Baru butuh storage eksternal setelah logika di step 3-4 terbukti benar |
| 6 | Config file + `docker-compose.yml` | Titik proyek baru bisa **dibagikan** ke orang lain |
| 7 | CLI (wrapper tipis di atas REST API yang sudah ada) | Murah dibuat kalau core sudah benar dipisah dari channel |
| 8 | Web UI read-only (lihat status key/usage) | Read-only dulu sebelum bisa manage — lebih cepat kasih nilai |
| 9 | Fallback lintas provider + model alias | Generalisasi satu level dari rotasi key; butuh step 3-4 stabil dulu |
| 10 | MCP server (wrapper tipis lain) — dasar berbasis teks/JSON dulu, MCP Apps (§4.1) sebagai enhancement opsional setelah ini stabil | Baru berguna kalau core sudah reliable — agent butuh gateway yang stabil |
| 11 | Enkripsi key at-rest + audit log | Wajib sebelum proyek dipakai orang lain/publik (bukan prioritas saat masih dipakai sendiri) |
| 12 | Provider Registry Sync (§10.3) | Nice-to-have kualitas jangka panjang, bukan blocker awal |

Realistis: **step 0–6 bisa selesai 1–2 minggu** kalau fokus, dan di titik itu sudah ada sesuatu yang genuinely berguna dipakai sehari-hari — jauh sebelum UI atau MCP selesai.

### 12.2 TDD sebagai proses menulis tiap step

Walking skeleton menjawab **urutan** ("apa dulu"), Test-Driven Development menjawab **proses** ("bagaimana menulis kode di tiap step"). Keduanya didesain untuk dipasangkan (buku asal istilah walking skeleton judulnya *"Guided by Tests"*).

Siklus per unit kerja (mis. step 3, key rotation):
1. **Red** — tulis test: *"3 key terdaftar, key pertama dipakai → key berikutnya harus key kedua"* → gagal karena `selectNextKey()` belum ada.
2. **Green** — implementasi paling sederhana supaya test lulus.
3. **Refactor** — rapikan struktur (mis. jadi `KeyPoolManager`), test harus tetap hijau.

Diterapkan selektif, bukan ke semua kode:

| Bagian | TDD ketat? |
|---|---|
| Key rotation, cooldown, fallback logic | ✅ — logika murni, rawan bug |
| Provider adapter (translate request/response) | ✅ — pakai *contract test* yang sama untuk semua adapter |
| Auth/virtual key validation | ✅ — ini keamanan, wajib ada test |
| Web UI | ❌ — cukup test manual/E2E ringan |
| Step 0 (walking skeleton awal) | ⚠️ Opsional — kadang di-*spike* dulu, ditulis ulang pakai TDD setelah tahu bentuknya |

### 12.3 Workflow saat dikembangkan dengan AI coding assistant

AI paling efektif kalau scope kecil dan kontraknya jelas — ini alasan tambahan kenapa walking skeleton (§12.1) makin penting saat pakai AI, bukan kurang penting.

| Tahap | Siapa mengerjakan apa |
|---|---|
| Tulis kontrak/interface (`ProviderAdapter`, format virtual key, skema key pool) | **Manusia** — keputusan arsitektur tidak diserahkan ke AI |
| Tulis test case dari behavior yang diinginkan | AI draft → **manusia review** sebelum implementasi dimulai |
| Implementasi sampai test hijau | AI |
| Refactor | AI, dengan test sebagai pengaman |
| Review kode keamanan-sensitif (enkripsi key, auth, MCP tool scoping) | **Manusia wajib**, tidak boleh dilewati |
| Contract test lintas adapter | Manusia desain sekali, AI reuse tiap adapter baru |

Praktik pendukung:
- **Satu task AI = satu step walking skeleton** — jangan minta "buatkan seluruh gateway sekaligus" dalam satu sesi; pecah per step supaya bisa direview satu-satu.
- **Beri konteks yang relevan saja** (kontrak adapter + 1 contoh adapter lain + dokumentasi API provider), bukan seluruh repo tiap kali.
- **Commit granular per step** — gampang di-revert kalau satu step salah asumsi, tanpa membuang progres step lain.

### 12.4 Antisipasi AI menulis mock/stub, bukan implementasi nyata

Masalah umum: AI menulis kode yang *terlihat* lengkap tapi sebenarnya `TODO`/stub/mock yang cuma bikin test lulus tanpa menguji logika sungguhan. Lapis pertahanan:

1. **Instruksi eksplisit anti-mock** di instruksi proyek (mis. `CLAUDE.md`): dilarang menulis placeholder/mock di kode produksi; kalau ada bagian yang tidak bisa diselesaikan (butuh key/akses yang belum ada), **AI harus berhenti dan bertanya**, bukan mengisi mock diam-diam.
2. **Grep otomatis di CI/pre-commit**: `grep -rn "TODO\|FIXME\|mock\|stub\|placeholder\|NotImplementedError" src/` → build gagal kalau ketemu di kode non-test.
3. **Fixture dari response API nyata** (bukan mock karangan) untuk test adapter provider: rekam sekali response asli (pakai key sandbox/free-tier), simpan sebagai fixture JSON, test jalan terhadap fixture itu — bukan bentuk response yang ditebak AI.
4. **Minta AI benar-benar eksekusi dan tunjukkan output nyata** (log test runner, hasil `curl`), bukan cuma klaim "sudah jalan".
5. **Definition of Done konkret**, bukan subjektif — contoh: "curl ke endpoint mengembalikan response teks nyata dari API Gemini, status 200, bisa direproduksi siapa saja lewat README" — bukan "adapter sudah dibuat".
6. **Uji test dengan merusak implementasi sengaja** (mutation-testing sederhana): kalau implementasi dipaksa `return null` dan test tetap hijau, berarti test itu tidak menguji apa-apa yang berarti — tanda AI menulis test yang menyesuaikan diri dengan implementasi setengah jadi, bukan menguji behavior yang seharusnya.

### 12.5 Antisipasi AI menambah fitur tanpa memikirkan desain/ekstensibilitas

Masalah umum lain: AI optimasi ke "fitur berhasil dibuat", bukan "desain yang mudah diperluas", kecuali diarahkan eksplisit.

1. **Pisahkan tahap Plan dan Code** — minta AI menjelaskan rencana (file yang disentuh, apakah butuh ubah interface, pola existing yang harus diikuti) *sebelum* menulis kode, supaya desain bisa dikoreksi sebelum ada 200 baris kode jadi.
2. **Definisikan extension point eksplisit dari awal** (kontrak adapter, dsb — lihat §12.1 step 1) — titik paling rawan adalah saat extension point belum ada dan AI diminta nambah fitur baru: AI cenderung menambah `if/else` di kode lama daripada membuat abstraksi baru, karena itu jalan tercepat menuju "fitur berhasil".
3. **Minta AI mencari pola existing dulu** sebelum menulis kode baru, dan mengikuti pola itu kecuali ada alasan kuat untuk berbeda — supaya style/struktur tetap konsisten di seluruh codebase.
4. **Checklist review desain** (bukan cuma "apakah fitur jalan"): apakah ini menambah percabangan baru di kode generic atau lewat extension point yang ada; apakah pola ini scalable kalau diulang 5–10x lagi; apakah ada duplikasi logika; apakah kontrak yang dipakai bagian lain ikut berubah dan sudah disesuaikan di semua pemakainya.
5. **Minta 2 alternatif + trade-off** ("satu paling cepat, satu paling mudah diperluas") — memaksa AI keluar dari mode "jalan tercepat".
6. **Sesi refactor terpisah secara berkala** (mis. tiap 3–4 fitur baru), dengan instruksi eksplisit "jangan tambah fitur, cari duplikasi/inkonsistensi dari fitur-fitur terakhir" — mencegah technical debt menumpuk diam-diam.
7. **Boundary modul yang tegas di struktur folder** (§9: `core`/`adapters`/`server`/`cli`/`mcp-server` terpisah jelas) — arsitektur yang baik jadi pagar alami yang membatasi AI, tidak melulu mengandalkan instruksi yang bisa lupa diulang tiap sesi.
8. **Minta AI menyebut asumsi & keterbatasan yang diambil** setelah selesai (concurrency, edge case, ekstensibilitas ke provider lain) — memaksa AI mengeksplisitkan hal yang biasanya baru kelihatan kalau ditanya.

> Prinsip inti §12.4–12.5: **manusia pegang kendali arsitektur, kontrak, dan keputusan keamanan; AI pegang kecepatan implementasi dalam batas yang sudah didefinisikan** — bukan AI dilepas merancang sistem dari nol maupun dibiarkan mengisi bagian sulit dengan jalan pintas.

### 12.6 Antisipasi AI memakai pengetahuan usang (versi/API/model yang sudah deprecated)

Masalah berbeda dari §12.4–12.5: bukan soal AI malas atau sembarangan, tapi **pengetahuan AI beku di titik training cutoff-nya** — jadi dia bisa menyarankan versi library, cara pakai API, atau nama model yang waktu itu current, padahal sekarang sudah berubah/deprecated.

1. **Jangan andalkan ingatan AI untuk versi/nama spesifik — beri sumber kebenaran nyata**: instruksikan AI membaca `package.json`/lockfile yang ada di repo sebelum menyarankan cara pakai suatu library, dan mengecek dokumentasi resmi terbaru (lewat web search/fetch) untuk API yang cepat berubah — bukan menebak dari memori.
2. **Khusus proyek ini: jangan biarkan AI hardcode nama model dari memori.** Ini alasan tambahan kenapa **Provider Registry Sync (§10.3) penting** — instruksikan AI untuk selalu mengambil nama model dari `registry/free-tier.json`/hasil health-check saat runtime, bukan menulis literal nama model (mis. versi yang sudah dipensiunkan) langsung di kode.
3. **Compiler/type-checker sebagai ground truth** — TypeScript strict mode + tipe dari package yang benar-benar terpasang akan langsung error kalau AI menyarankan API yang sudah deprecated, lebih diandalkan daripada berharap AI "ingat" perubahannya.
4. **Lint rule eksplisit untuk pola yang diketahui usang** — kalau tim tahu ada pola lama yang sering muncul dari AI (mis. gaya callback lama, library yang sudah digantikan), tolak lewat custom ESLint rule di CI, bukan mengandalkan AI sadar sendiri tiap sesi.
5. **Dependency bot terpisah dari sesi coding AI** — Renovate/Dependabot menjaga dependency tetap update secara independen, sehingga versi library di lockfile tetap current apapun yang diusulkan AI dalam satu sesi.
6. **Decision doc eksplisit** ("pakai X, bukan Y — deprecated") di instruksi proyek untuk keputusan yang sudah pernah dibuat, supaya AI tidak kembali ke pola lama yang lebih familiar secara statistik baginya.
7. **Minta AI menyebutkan tingkat keyakinannya** soal versi/API yang disarankan, dan eksplisit bilang kalau ada risiko itu sudah berubah sejak training cutoff-nya — supaya ketidakpastian terlihat, bukan disampaikan seolah pasti benar.
8. **Fokuskan review manusia** di titik paling rawan basi: versi API pihak ketiga, nama/parameter model LLM, dan library yang sering ganti major version.

> Prinsip yang sama dengan §10.3: **jangan percaya "ingatan" untuk fakta yang cepat berubah — selalu sediakan jalur verifikasi ke sumber aktual** (file di repo, dokumentasi live, atau compiler), baik itu ingatan AI maupun data model statis di gateway sendiri.

---

## 13. Risiko & Mitigasi

- **Provider berubah kebijakan free tier / API mendadak** → desain adapter sebagai plugin terisolasi supaya cepat di-patch komunitas; jangan hardcode asumsi kuota.
- **Disalahgunakan untuk melanggar ToS provider** (mis. spam banyak akun gratis) → cantumkan disclaimer jelas di README, dan sediakan fitur governance (limit, audit) supaya proyek bisa dipakai secara bertanggung jawab oleh operator-nya sendiri; ini tanggung jawab pemakai, tapi gateway sebaiknya tidak secara eksplisit mendorong pelanggaran ToS (mis. jangan bikin fitur "auto-buat akun gratis massal").
- **Kompleksitas maintain banyak adapter** → kontrak adapter yang jelas + test suite contract-based supaya kontribusi komunitas gampang direview.
- **Isu keamanan seperti kasus LiteLLM** → automated dependency scanning, disclosure policy jelas (`SECURITY.md`), rilis patch cepat.

---

## Daftar Sumber

Dokumen ini memakai banyak sitasi bernomor (`[4-1]`, `[5-1]`, dst.) yang merujuk ke hasil riset saat dokumen ini disusun. Untuk klaim yang cepat basi (angka rate limit, tanggal perubahan kebijakan provider, dsb.), daftar ini penting supaya siapa pun di tim bisa memverifikasi ulang tanpa riset dari nol.

- **Per bagian dokumen**: kelompokkan URL sumber asli berdasarkan section yang mengutipnya (§2 riset kompetitor, §10 daftar provider gratis, dll).
- **Tanggal akses**: catat kapan tiap sumber diriset, bukan cuma kapan dokumen ini ditulis — supaya jelas mana data yang mungkin sudah berubah sejak dibaca.
- **Status snapshot**: tandai eksplisit bagian mana yang datanya "snapshot" dan **wajib** diverifikasi ulang sebelum dipakai sebagai keputusan final — terutama **§10.1** (tabel provider gratis) dan bagian riset kompetitor di **§2** yang menyebut status akuisisi/perubahan produk terbaru.

> Catatan implementasi: isi daftar sumber lengkap (URL per sitasi) belum dilampirkan di draf ini — tambahkan saat proses riset final, sebelum dokumen dipakai sebagai acuan keputusan.

---

## Ringkasan Rekomendasi Cepat

1. **Bahasa: TypeScript + Hono** (portable serverless ↔ self-host).
2. **Core dipisah dari channel** (Web UI/CLI/MCP semua tipis, manggil core yang sama).
3. **Diferensiator: native multi-key/multi-provider free-tier pooling** — ini yang belum digarap serius kompetitor besar.
4. **Keamanan bukan fitur tambahan** — enkripsi, virtual key, MCP auth wajib on by default sejak MVP.
5. **Mulai dari Cloudflare Workers + Docker Compose** sebagai dua target deploy utama, baru perluas ke Deno/Vercel/K8s belakangan.
6. **Bangun pakai walking skeleton (§12.1)** — step 0-6 (proxy dasar → multi-key → deploy-able) realistis 1-2 minggu, jangan mulai dari UI/MCP/fitur besar sekaligus.
7. **Kalau dikembangkan dengan AI coding assistant** — kontrak/interface tetap ditulis manusia, satu task AI = satu step walking skeleton, dan selalu ada checklist anti-mock (§12.4) + anti-desain-serampangan (§12.5) di tiap review.
