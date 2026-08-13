# CLAUDE.md — packages/cli

Baca juga `CLAUDE.md` root.

## Isi package ini

CLI `aigw` — wrapper tipis di atas REST API `packages/server`. Walking skeleton
step 7 (§12.1): "murah dibuat kalau core sudah benar dipisah dari channel."

## Aturan

- Jangan implementasikan logika bisnis di sini (key rotation, auth, dll). Semua
  command cuma memanggil endpoint REST yang sudah ada di `packages/server`.
- Kalau endpoint yang dibutuhkan belum ada di server, JANGAN mock response-nya di
  CLI — tandai command sebagai belum diimplementasikan (lihat pola di
  `src/index.ts`) dan kerjakan endpoint server-nya dulu.
- Command harus punya output yang scriptable (opsi `--json`) selain human-readable,
  supaya CLI ini juga bisa dipakai dari script/CI orang lain.
