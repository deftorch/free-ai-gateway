## Ringkasan

<!-- Apa yang diubah dan kenapa. Link ke issue walking-skeleton-step jika ada. -->

## Definition of Done

<!-- Copy dari issue terkait, dan tunjukkan bukti nyata (output test, hasil curl), bukan klaim -->

## Checklist

- [ ] `bun run lint` lulus
- [ ] `bun run typecheck` lulus
- [ ] `bun run test` lulus (termasuk contract test jika menyentuh adapter)
- [ ] `bun run anti-mock-check` lulus — tidak ada mock/stub/TODO di kode produksi
- [ ] Kalau menyentuh kontrak (`adapter.contract.ts`, skema DB, auth): sudah didiskusikan/direview manusia, bukan keputusan sepihak agen
- [ ] Kalau menambah tabel baru: kolom `tenant_id` ada (lihat `docs/adr/0002-...`)
- [ ] Asumsi/keterbatasan yang diambil disebutkan di bawah ini

## Asumsi & keterbatasan

<!-- concurrency, edge case, ekstensibilitas ke provider lain, dll -->
