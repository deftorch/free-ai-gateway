# Walking Skeleton — Checklist Progres

Ekstrak actionable dari `docs/desain-free-ai-gateway-gabungan.md` §12.1. Centang
step di sini saat PR-nya merge, supaya siapa pun (manusia atau agen baru yang masuk
sesi) langsung tahu **sedang di step berapa** tanpa harus membaca ulang prosa.

**Aturan**: jangan mulai step N+1 sebelum step N selesai dan tercentang. Kalau
sebuah task tampak butuh melompat step (mis. butuh Web UI padahal baru step 2),
itu sinyal untuk berhenti dan tanya, bukan mengerjakan di luar urutan.

| # | Step | TDD ketat? | Status |
|---|---|:---:|:---:|
| 0 | Single-file proxy: 1 provider, 1 key, forward apa adanya (validasi jalur end-to-end + streaming) | ⚠️ opsional (boleh spike dulu) | ✅ |
| 1 | Provider kedua + kontrak `ProviderAdapter` | ✅ (contract test) | ✅ |
| 2 | Virtual API key + kolom `tenant_id` di skema sejak awal | ✅ (keamanan) | ✅ |
| 3 | Multi-key per provider + rotasi round-robin | ✅ | ⬜ |
| 4 | Deteksi 429 + cooldown (in-memory) | ✅ | ⬜ |
| 5 | Persist state ke SQLite/KV | ✅ | ⬜ |
| 6 | Config file + `docker-compose.yml` (titik "bisa dibagikan ke orang lain") | ❌ | ⬜ |
| 7 | CLI (wrapper tipis di atas REST API) | ❌ | ⬜ |
| 8 | Web UI read-only (status key/usage) | ❌ | ⬜ |
| 9 | Fallback lintas provider + model alias | ✅ | ⬜ |
| 10 | MCP server (dasar teks/JSON dulu, MCP Apps menyusul) | ✅ (tool scoping) | ⬜ |
| 11 | Enkripsi key at-rest + audit log | ✅ (keamanan) | ⬜ |
| 12 | Provider Registry Sync (§10.3) | ❌ | ⬜ |

**Target realistis**: step 0–6 dalam 1–2 minggu kalau fokus — di titik itu sudah ada
sesuatu yang genuinely berguna dipakai sehari-hari, jauh sebelum UI/MCP selesai.

## Cara update checklist ini

Saat membuka PR untuk sebuah step, ganti `⬜` jadi `🔄` di baris terkait. Saat PR
merge dan Definition of Done terbukti (lihat `CLAUDE.md` root), ganti jadi `✅`.
