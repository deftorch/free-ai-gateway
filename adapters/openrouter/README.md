# adapters/openrouter — status: BELUM diimplementasikan

Ini adalah folder scaffold untuk provider OpenRouter (§10.1). Sengaja **tidak diisi**
implementasi `adapter.ts` di tahap scaffolding repo ini — mengisi dengan kode
mock/stub yang terlihat lengkap tapi tidak benar-benar memanggil API OpenRouter akan
melanggar aturan anti-mock di `CLAUDE.md` root.

## Yang perlu dikerjakan (Step 0–1 walking skeleton, §12.1)

1. Implementasikan `src/adapter.ts` yang memenuhi `ProviderAdapter` dari
   `packages/core/src/adapter.contract.ts`, memanggil OpenRouter API sungguhan.
2. Rekam response asli dari `GET /v1beta/models` dan `POST
   /v1beta/models/{model}:generateContent` pakai key sandbox/free-tier nyata,
   timpa placeholder di
   `adapters/_contract-tests/fixtures/openrouter/list-models.json` dengan hasil rekaman
   itu (fixture yang ada sekarang eksplisit ditandai sebagai placeholder, belum
   response nyata — lihat catatan di file JSON-nya).
3. Jalankan `bun run test:contract` sampai lulus terhadap fixture nyata.

Lihat `adapters/CLAUDE.md` untuk aturan lengkap menambah adapter.
