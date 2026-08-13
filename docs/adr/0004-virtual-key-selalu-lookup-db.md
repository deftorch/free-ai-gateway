# ADR 0004: Virtual key selalu di-lookup ke database, tidak pernah dipercaya dari input klien

**Status**: Diterima — aturan keamanan inti, tidak boleh dibalik tanpa diskusi eksplisit dengan manusia

## Konteks

Virtual key menentukan `tenant_id` yang dipakai untuk seluruh request (rate limit,
akses provider key, audit log). Kalau `tenant_id` diterima mentah dari header atau
parameter yang dikirim klien, user bisa menyamar sebagai tenant lain dengan
memanipulasi header.

## Keputusan

`tenant_id` HANYA boleh didapat dari hasil lookup virtual key (dari header
`Authorization`) ke database. Tidak pernah diterima langsung dari body/query/header
lain yang diklaim klien sebagai `tenant_id`.

## Konsekuensi

- Middleware auth di `packages/server` dan `packages/mcp-server` wajib melakukan
  lookup ini di setiap request sebelum handler lain dipanggil.
- Kode auth ini identik di mode single-tenant maupun multi-tenant (lihat ADR 0002).

## Untuk agen

Kalau menulis atau mengubah middleware auth, endpoint baru, atau tool MCP baru: cek
eksplisit bahwa `tenant_id` datang dari hasil lookup DB, bukan dari
`request.headers['x-tenant-id']` atau sejenisnya. Kalau ragu, tanyakan ke manusia
sebelum implementasi — ini bukan area untuk asumsi jalan pintas.
