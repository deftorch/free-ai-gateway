/**
 * MCP server yang membungkus packages/core sebagai tool MCP (chat_completion,
 * list_models, check_quota — §3 Fase 3). BELUM diimplementasikan — ini walking
 * skeleton step 10 (§12.1), baru dikerjakan setelah core+server stabil (step 0-9).
 *
 * Saat mengimplementasikan: setiap tool WAJIB scoping eksplisit dan validasi
 * tenant lewat lookup DB (docs/adr/0004-...) — lihat peringatan §2.3 dokumen
 * desain soal server MCP publik yang berjalan tanpa access control berarti.
 */

throw new Error(
  "packages/mcp-server belum diimplementasikan — ini walking skeleton step 10 (§12.1). " +
    "Jangan isi tool dengan hasil karangan; lihat CLAUDE.md di package ini.",
);
