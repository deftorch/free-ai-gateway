# ADR 0002: Skema multi-tenant sejak hari pertama, deploy default single-tenant

**Status**: Diterima

## Konteks

Gateway ini bisa dipakai sendiri (single-user) atau dijalankan untuk tim/komunitas
(multi-tenant). Menambah kolom `tenant_id` setelah ada data produksi berarti migrasi
skema yang menyakitkan.

## Keputusan

Setiap tabel yang menyimpan data milik user punya kolom `tenant_id` sejak skema
pertama, walau nilainya cuma satu konstanta `"default"` di mode single-user. Toggle
`MULTI_TENANT_MODE=off|on` hanya menyalakan/mematikan bagian UI dan endpoint admin —
**tidak pernah** mengubah skema database atau kode routing/rate-limit.

## Konsekuensi

- Kode auth identik di single-tenant maupun multi-tenant; bedanya cuma jumlah tenant
  di database.
- Migrasi single-user → multi-tenant jadi ganti env var, tanpa migrasi data.
- Setiap tabel baru yang dibuat AGEN atau manusia WAJIB menyertakan `tenant_id` —
  ini ditegakkan lewat review, bukan (saat ini) lint otomatis.

## Alternatif yang ditolak

- **Dua versi kode terpisah (single-tenant vs multi-tenant)**: ditolak karena
  duplikasi maintenance dan risiko divergensi aturan keamanan antar dua versi.
- **Tambah `tenant_id` belakangan saat dibutuhkan**: ditolak karena migrasi skema
  setelah ada data produksi jauh lebih mahal daripada kolom ekstra yang awalnya
  bernilai konstan.
