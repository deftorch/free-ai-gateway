# CLAUDE.md — packages/web

Baca juga `CLAUDE.md` root. Belum ada kode di package ini (walking skeleton
step 8, §12.1 — "Web UI read-only" dulu, sebelum bisa manage).

## Aturan saat mulai dikerjakan

- Stack: React + Vite, komponen shadcn/ui, styling Tailwind (§5).
- Dashboard baca data lewat REST API `packages/server` yang sama dipakai CLI/MCP —
  jangan query database langsung dari frontend.
- Step 8 walking skeleton eksplisit **read-only dulu**: daftar key & status,
  usage per key/provider/model. Fitur manage (nonaktifkan key, generate virtual
  key) menyusul setelah read-only stabil — jangan gabungkan keduanya dalam satu task.
- Test: E2E ringan cukup, tidak perlu TDD ketat untuk komponen UI (§12.2).
