import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum di-set. Jalankan `vercel env pull .env.local` dulu.");
  }
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrasi selesai.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
