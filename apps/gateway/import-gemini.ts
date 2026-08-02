import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../packages/database/src/schema";
import { encryptApiKey } from "../../packages/core/src/crypto";
import fs from "fs";
import path from "path";

async function main() {
  const envLocalPath = path.resolve("../../.env.local");
  const envLocalContent = fs.readFileSync(envLocalPath, "utf-8");
  
  const keys: string[] = [];
  for (const line of envLocalContent.split("\n")) {
    const match = line.match(/^GEMINI_API_KEY_\d+=(.*)/);
    if (match) {
      keys.push(match[1].trim());
    }
  }

  if (keys.length === 0) {
    console.log("Tidak ada kunci GEMINI_API_KEY ditemukan.");
    return;
  }

  console.log(`Ditemukan ${keys.length} kunci Gemini.`);

  const envPath = path.resolve("../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^KEY_ENCRYPTION_SECRET=(.*)/);
      if (match) {
        process.env.KEY_ENCRYPTION_SECRET = match[1].trim();
      }
    }
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  for (let i = 0; i < keys.length; i++) {
    const rawKey = keys[i];
    const label = `Gemini Key ${i + 1}`;
    
    // Pastikan KEY_ENCRYPTION_SECRET ada
    if (!process.env.KEY_ENCRYPTION_SECRET) {
      throw new Error("KEY_ENCRYPTION_SECRET tidak ditemukan di environment.");
    }

    console.log(`Mengenkripsi ${label}...`);
    const encryptedKey = await encryptApiKey(rawKey);

    console.log(`Menyimpan ${label} ke database...`);
    await db.insert(schema.apiKeys).values({
      providerId: "google-ai-studio",
      label,
      keyEncrypted: encryptedKey,
      status: "active",
      errorCount: 0,
    }).onConflictDoNothing();
    
    console.log(`Berhasil menambahkan ${label} ke database.`);
  }

  console.log("Selesai!");
}

main().catch(console.error);
