# CLAUDE.md — adapters/

Baca juga `CLAUDE.md` root dan kontrak di `packages/core/src/adapter.contract.ts`
sebelum menulis adapter baru.

## Menambah provider baru

1. Buat folder `adapters/<provider-id>/` (nama harus match `providerId` di kontrak).
2. Implementasikan `ProviderAdapter` dari `packages/core/src/adapter.contract.ts` di
   `adapters/<provider-id>/src/adapter.ts`. Jangan ubah kontraknya sendiri.
3. **Rekam fixture response NYATA** dari API provider (pakai key sandbox/free-tier
   milik sendiri), simpan sebagai JSON di
   `adapters/_contract-tests/fixtures/<provider-id>/`. JANGAN mengarang bentuk
   response dari memori — nama field/error provider berubah antar versi API dan
   ingatan model bisa usang (lihat CLAUDE.md root aturan keras poin 2).
4. Adapter baru otomatis dites oleh suite yang sama di
   `adapters/_contract-tests/adapter.contract.test.ts` — jangan tulis contract test
   terpisah per adapter, itu justru menghilangkan gunanya contract testing (semua
   adapter harus lulus definisi behavior yang SAMA).
5. Tambahkan entri provider ke `registry/free-tier.json` di root (link resmi,
   kolom butuh-kartu-kredit, dll) — bukan bagian dari kode adapter, tapi wajib
   untuk provider baru supaya muncul di Model Catalog (§10.3).

## Definition of Done untuk adapter baru

`bun run test:contract` lulus dengan fixture nyata, DAN bukti `curl` end-to-end
lewat gateway (lihat CLAUDE.md root untuk format DoD yang benar).

## Larangan

- Jangan tambah `if (providerId === "...")` di `packages/core` untuk menangani
  provider tertentu — semua kekhususan provider ada di dalam adapter masing-masing.
- Jangan hardcode nama model dari memori.
