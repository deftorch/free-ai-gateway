import { db, tenants, virtualKeys } from "../packages/core/src/index";
import { createHash, randomBytes } from "crypto";

async function main() {
  console.log("Menjalankan script pembuatan Virtual Key...");

  // 1. Seed tenant default (idempotent)
  try {
    await db.insert(tenants).values({
      id: "default",
      name: "Default Tenant",
      createdAt: new Date().toISOString(),
    }).onConflictDoNothing();
    console.log("✅ Tenant 'default' dipastikan ada.");
  } catch (err) {
    console.error("❌ Gagal membuat tenant default:", err);
    process.exit(1);
  }

  // 2. Generate key
  const randomStr = randomBytes(24).toString("base64url");
  const rawKey = `fag_sk_${randomStr}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 15); // "fag_sk_" (7) + 8 chars = 15

  // 3. Insert ke virtual_keys
  try {
    await db.insert(virtualKeys).values({
      id: `vk_${Date.now()}`,
      tenantId: "default",
      keyHash,
      keyPrefix,
      scopes: ["gemini", "nvidia-nim"], // array string, sesuai rekomendasi
      createdAt: new Date().toISOString(),
    });
    console.log("\n✅ Virtual Key berhasil dibuat!");
    console.log("==================================================");
    console.log(`Kunci Rahasia (SIMPAN SEKARANG, tidak akan ditampilkan lagi):`);
    console.log(`\x1b[32m${rawKey}\x1b[0m`);
    console.log("==================================================");
    console.log(`Prefix untuk UI: ${keyPrefix}...`);
    console.log(`Hash di DB: ${keyHash}`);
    console.log(`Tenant ID: default`);
  } catch (err) {
    console.error("❌ Gagal membuat virtual key:", err);
    process.exit(1);
  }
}

main();
