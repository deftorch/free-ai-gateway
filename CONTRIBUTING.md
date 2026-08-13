# Contributing

## Sebelum mulai

1. Baca `CLAUDE.md` (root) — berlaku untuk semua kontributor, manusia maupun agen AI.
2. Baca `docs/adr/` — jangan usulkan ulang keputusan yang sudah diambil di sana
   tanpa argumen baru yang kuat.
3. Kalau kontribusi lewat agen AI (Claude Code dkk), pastikan agen membaca
   `CLAUDE.md` di root DAN di package yang disentuh sebelum mulai kerja.

## Alur kerja

1. Cek `docs/desain-free-ai-gateway-gabungan.md` §12.1 untuk urutan walking
   skeleton — kerjakan sesuai urutan, jangan lompat step.
2. Buat issue pakai template "Walking Skeleton Step" kalau belum ada.
3. Branch: `feat/<ringkas>`, `fix/<ringkas>`, `docs/<ringkas>`.
4. Commit message: [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
5. Sebelum membuka PR, jalankan lokal:
   ```bash
   bun run lint && bun run typecheck && bun run test && bun run anti-mock-check
   ```
6. Isi PR template lengkap, termasuk bukti nyata (bukan klaim) bahwa Definition
   of Done tercapai.

## Menambah provider adapter baru

Ikuti langkah di `adapters/CLAUDE.md` — ringkasnya: implementasikan kontrak di
`packages/core/src/adapter.contract.ts`, rekam fixture response nyata, lulus
contract test, daftarkan di `registry/free-tier.json`.

## Kode etik

Proyek ini mengikuti [Contributor Covenant](https://www.contributor-covenant.org/).
Bersikap baik, kritik ide bukan orang.
