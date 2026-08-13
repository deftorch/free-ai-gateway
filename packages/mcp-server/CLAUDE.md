# CLAUDE.md — packages/mcp-server

Baca juga `CLAUDE.md` root. Package ini adalah area keamanan-sensitif (lihat
`.github/CODEOWNERS`) — perubahan wajib direview manusia.

## Isi package ini

Membungkus `packages/core` sebagai tool MCP: `chat_completion`, `list_models`,
`check_quota` (§3 Fase 3), transport Streamable HTTP via `@modelcontextprotocol/sdk`.

## Status saat ini

Belum diimplementasikan (lihat `src/index.ts`, sengaja `throw` di module load
supaya tidak ada yang mengira ini sudah jalan). Ini walking skeleton step 10
(§12.1) — jangan dikerjakan sebelum step 0-9 (core, server, key rotation, fallback)
stabil, karena MCP server ini cuma wrapper tipis di atas itu.

## Aturan keras tambahan untuk package ini

1. **Setiap tool baru wajib scoping eksplisit** — tool tidak boleh mengakses
   provider/model di luar scope virtual key yang dipakai pemanggil.
2. **`tenant_id` selalu dari lookup DB**, sama seperti `packages/server`
   (`docs/adr/0004-...`) — MCP client tidak lebih dipercaya daripada REST client.
3. Kalau nanti mengimplementasikan MCP Apps (`ui://` resource, §4.1 dokumen
   desain): sanitasi ketat konten yang dikirim ke resource, CSP ketat di iframe,
   audit setiap `ui/message`/`ui/update-model-context` sama seperti tool-call biasa.
4. Tool harus tetap berguna sebagai teks/JSON biasa kalau host MCP tidak
   mendukung UI Apps — UI adalah enhancement, bukan satu-satunya jalur hasil.
