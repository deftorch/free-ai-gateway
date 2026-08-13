# Contoh Siklus TDD: Red → Green → Refactor

Ini contoh **referensi pola**, bukan implementasi produksi Step 3 (rotasi key —
itu baru dikerjakan setelah Step 0-2 selesai, lihat `walking-skeleton-checklist.md`).
Tujuannya: agen/kontributor baru bisa melihat bentuk konkret siklus yang disebut di
`packages/core/CLAUDE.md`, bukan cuma nama istilahnya.

Kasus: `selectNextKey()` — dari 3 key terdaftar, key pertama dipakai, request
berikutnya harus pakai key kedua (round-robin sederhana).

## 1. Red — tulis test dulu, harus gagal

```typescript
// packages/core/src/key-pool/key-pool.test.ts
import { describe, it, expect } from "vitest";
import { KeyPoolManager } from "./key-pool";

describe("KeyPoolManager.selectNextKey", () => {
  it("berpindah ke key kedua setelah key pertama dipakai", () => {
    const pool = new KeyPoolManager(["key-a", "key-b", "key-c"]);

    const first = pool.selectNextKey();
    const second = pool.selectNextKey();

    expect(first).toBe("key-a");
    expect(second).toBe("key-b");
  });
});
```

Jalankan `bun --filter @free-ai-gateway/core test` → **gagal**, karena
`KeyPoolManager` belum ada. Ini kondisi Red yang benar — jangan lanjut ke
implementasi sebelum melihat test ini gagal dulu (kalau langsung hijau di
percobaan pertama, kemungkinan test-nya tidak benar-benar menguji apa pun).

## 2. Green — implementasi paling sederhana supaya lulus

```typescript
// packages/core/src/key-pool/key-pool.ts
export class KeyPoolManager {
  private index = 0;
  constructor(private readonly keys: string[]) {}

  selectNextKey(): string {
    const key = this.keys[this.index % this.keys.length];
    this.index++;
    return key;
  }
}
```

Jalankan test lagi → **hijau**. Sengaja belum menangani cooldown/429 (itu Step 4) —
implementasi paling sederhana yang lulus test yang ADA, tidak lebih.

## 3. Refactor — rapikan, test harus tetap hijau

Contoh refactor yang valid di titik ini: ekstrak tipe status key kalau sudah
kelihatan akan dibutuhkan segera (Step 4), TANPA menambah behavior baru yang
belum ditest:

```typescript
export type KeyStatus = "active" | "cooldown" | "exhausted" | "disabled";

export class KeyPoolManager {
  private index = 0;
  constructor(private readonly keys: string[]) {}

  selectNextKey(): string {
    const key = this.keys[this.index % this.keys.length];
    this.index++;
    return key;
  }
}
```

Jalankan test → tetap hijau. Kalau refactor membutuhkan test BARU untuk
membuktikan behavior baru (mis. cooldown), itu tandanya bukan refactor lagi —
kembali ke langkah Red untuk unit kerja berikutnya (Step 4).

## Kapan pola ini WAJIB dipakai (lihat §12.2 dokumen desain)

| Bagian | TDD ketat? |
|---|:---:|
| Key rotation, cooldown, fallback logic | ✅ |
| Provider adapter (pakai contract test yang sama untuk semua adapter) | ✅ |
| Auth/virtual key validation | ✅ |
| Web UI | ❌ (E2E ringan/manual cukup) |
| Step 0 walking skeleton | ⚠️ opsional — boleh spike dulu, ditulis ulang pakai TDD setelah tahu bentuknya |
