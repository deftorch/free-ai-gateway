# Task Brief — Step 5: Persist State ke SQLite (Cooldown)

> Status referensi: hasil diskusi desain sebelum implementasi. Ikuti alur TDD
> Red-Green-Refactor. Jangan mengerjakan item di luar "Scope" — catat sebagai
> komentar `// SENGAJA belum ada: ...` mengikuti konvensi yang sudah dipakai.

## Keputusan desain yang sudah disepakati (jangan didebat ulang saat implementasi)

- **SQLite via Drizzle yang sudah ada** — BUKAN membangun abstraksi
  `KV_DRIVER` (memory/redis/cloudflare-kv) dari `.env.example`. Itu di luar
  scope step ini.
- Yang di-persist **hanya** state `cooldowns` (key → waktu berakhir).
  Round-robin `index` di `KeyPoolManager` TIDAK perlu persist — boleh reset
  ke 0 setiap restart, tidak merusak korektnes.
- `KeyPoolManager` (`packages/core/src/key-pool/key-pool.ts`) **tetap
  sinkron**, tidak berubah jadi `async`. Test murni yang sudah ada
  (`key-pool.test.ts`) TIDAK BOLEH diubah bentuknya — hanya ditambah test
  baru untuk logic load/save.
- Provider key **TIDAK PERNAH** disimpan mentah di kolom baru manapun.
  Selalu SHA-256 hash, mengikuti pola `virtual_keys.keyHash` yang sudah ada
  sejak Step 2.

## Scope (WAJIB dikerjakan)

1. **Tabel baru** di `packages/core/src/db/schema.ts`, gaya konsisten dengan
   tabel yang sudah ada:
   ```ts
   export const keyCooldowns = sqliteTable("key_cooldowns", {
     id: text("id").primaryKey(),
     provider: text("provider").notNull(),
     keyHash: text("key_hash").notNull(), // SHA-256 hash, JANGAN simpan key mentah
     cooldownUntil: integer("cooldown_until").notNull(), // epoch ms
     updatedAt: text("updated_at").notNull(),
   }, (table) => ({
     uniqueProviderKey: unique().on(table.provider, table.keyHash),
   }));
   ```
   (Nama kolom/tipe persis boleh disesuaikan saat implementasi, prinsip
   `unique(provider, key_hash)` yang wajib dipertahankan.)

2. **Satu fungsi gabungan di `packages/core/src/key-pool/index.ts`**
   (bukan dua titik terpisah di server):
   - `recordCooldown(providerName: string, key: string, retryAfterMs?: number): Promise<void>`
     — sekaligus (a) panggil `pool.markCooldown()` in-memory, (b) upsert ke
     tabel `key_cooldowns` pakai hash key.
   - Ganti kedua pemanggilan `pool.markCooldown(apiKey, err.retryAfterMs)`
     di `packages/server/src/index.ts` (jalur stream & non-stream) supaya
     memanggil `recordCooldown()` ini, bukan `pool.markCooldown()` langsung.

3. **Load saat startup**
   - Di `initializeAllPools()` (atau fungsi setara), setelah pool dibuat
     untuk tiap provider: query tabel `key_cooldowns` untuk provider itu,
     untuk tiap key di env var, hash lalu cocokkan ke DB — kalau ada baris
     dengan `cooldownUntil` masih di masa depan, panggil
     `pool.markCooldown(key, sisaWaktu)` supaya state ter-restore sebelum
     server mulai melayani request.
   - Baris dengan `cooldownUntil` sudah lewat boleh diabaikan (atau
     dibersihkan sekalian, opsional).

4. **Test wajib** (DB nyata via `db:push:test`, bukan mock — sesuai standar
   TDD ketat proyek untuk area key rotation/cooldown)
   - `recordCooldown()` menulis baris yang benar ke DB (hash, bukan key
     mentah — assert eksplisit bahwa key asli TIDAK ADA di baris manapun
     di tabel).
   - Restart simulasi: buat pool baru, panggil ulang fungsi load-saat-startup,
     assert key yang sebelumnya cooldown tetap ter-skip oleh
     `selectNextKey()` walau `KeyPoolManager` adalah instance baru.
   - Upsert: `recordCooldown()` dipanggil dua kali untuk key yang sama
     (kena 429 dua kali) → tetap satu baris di DB (bukan duplikat), dengan
     `cooldownUntil` ter-update ke nilai terbaru.

## Eksplisit DI LUAR scope

- Abstraksi `KV_DRIVER` (memory/redis/cloudflare-kv)
- Persist round-robin `index`
- Background cleanup job untuk baris cooldown yang sudah kedaluwarsa
- Encryption at-rest untuk tabel ini (tidak relevan karena isinya hash,
  bukan key mentah — beda dengan `provider_keys.encryptedKey` yang memang
  ditunda ke Step 11)

Tandai dengan komentar `// SENGAJA belum ada: ...` di titik kode yang
relevan.

## Definition of Done

```bash
bun run lint
bun run typecheck
bun run db:push:test
bun run test
bun run anti-mock-check
```

Plus bukti fungsional: jalankan server, picu 429 nyata (atau simulasi),
**restart server**, lalu tunjukkan lewat log/curl bahwa key yang sedang
cooldown tetap dilewati `selectNextKey()` setelah restart — ini bukti
inti yang membedakan Step 5 dari Step 4 (in-memory saja tidak akan lulus
skenario ini).

## Pertanyaan terbuka untuk direview manusia sebelum merge

- Apakah baris cooldown yang sudah kedaluwarsa perlu dibersihkan otomatis,
  atau dibiarkan menumpuk (tabel ini kecil, row count = jumlah key × jumlah
  provider, jadi kemungkinan tidak masalah untuk skala saat ini)?
- Format `id` primary key tabel baru — UUID generate manual, atau cukup
  `${provider}:${keyHash}` sebagai composite string (menghindari perlu
  generate UUID untuk tabel yang sudah punya unique constraint sendiri)?
