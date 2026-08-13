# ADR 0003: Drizzle ORM, bukan Prisma

**Status**: Diterima

## Konteks

Storage relasional perlu mendukung SQLite (self-host ringan, mode "1 file 0
dependency") dan Postgres (self-host skala besar) dari satu skema yang sama, dan
harus jalan di edge runtime (Cloudflare Workers dkk).

## Keputusan

Pakai Drizzle ORM.

## Konsekuensi

- Drizzle ringan dan resmi mendukung SQLite (`libsql`/Turso) & Postgres & edge
  runtime, sehingga satu skema query builder dipakai untuk kedua storage.
- Type-safe by default tanpa build step generator yang berat seperti Prisma.

## Alternatif yang ditolak

- **Prisma**: DX bagus dan populer, tapi engine binary-nya berat/tidak edge-native —
  butuh workaround (Prisma Accelerate/Data Proxy) untuk jalan di Workers, yang
  menambah dependency eksternal berbayar untuk kasus penggunaan yang seharusnya
  bisa gratis penuh.

## Catatan untuk agen

Jangan sarankan atau migrasikan ke Prisma tanpa diskusi eksplisit — ini keputusan
yang sudah diambil dengan trade-off yang dipertimbangkan, bukan default yang belum
dipikirkan.
