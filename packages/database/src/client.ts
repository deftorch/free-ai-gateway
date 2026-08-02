import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";
import { getEnvVar, getEnvVarOrDefault } from "./config/env";

type Db = NeonHttpDatabase<typeof schema>;

/**
 * PENTING (DI): semua pembacaan env di sini terjadi SAAT client benar-benar
 * dibuat (lazy, lewat getDbClient() di bawah), bukan saat modul ini di-import.
 * Ini mengikuti pola yang sama seperti `kv`/`qstash`/`openrouterAdapter` di
 * `packages/core` (lihat §5 poin 10) — sebelumnya client-client itu dibuat
 * sebagai singleton di top-level saat modul di-import, sehingga nilai env-nya
 * sudah kepalang dibaca sebelum Worker sempat memanggil `configureDatabaseEnv()`.
 */
function createDbInstance(): Db {
  const storageMode = getEnvVarOrDefault("STORAGE_MODE", "serverless");
  const connectionString =
    getEnvVar("DATABASE_URL") || "postgres://postgres:postgres@localhost:5432/free_ai_gateway";

  if (!getEnvVar("DATABASE_URL")) {
    console.warn(
      `[db] DATABASE_URL belum di-set. Menggunakan default fallback (${storageMode} mode).`
    );
  }

  if (storageMode === "selfhosted") {
    try {
      const pkgPg = ["p", "g"].join("");
      const { Pool } = require(pkgPg);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkgDrizzle = ["drizzle-orm", "node-postgres"].join("/");
      const { drizzle: drizzlePg } = require(pkgDrizzle);
      return drizzlePg(new Pool({ connectionString }), { schema }) as unknown as Db;
    } catch (e) {
      console.warn("[db] pg driver gagal diload, fallback ke neon-http.");
    }
  }

  return drizzleNeon(neon(connectionString), { schema });
}

let dbSingleton: Db | null = null;

/**
 * Ambil instance `db` (lazy singleton). Dibuat pertama kali benar-benar
 * dipakai, BUKAN saat modul di-import — supaya `configureDatabaseEnv()`
 * (Worker) atau `.env` (Node) sempat ke-load lebih dulu.
 */
export function getDbClient(): Db {
  if (!dbSingleton) {
    dbSingleton = createDbInstance();
  }
  return dbSingleton;
}

/**
 * Export `db` dipertahankan untuk kompatibilitas mundur (dipakai luas di
 * seluruh `packages/core` & `apps/gateway`). Secara internal ini adalah
 * `Proxy` yang menunda pembuatan instance Drizzle sungguhan sampai property
 * pertama (mis. `db.select`, `db.insert`, ...) benar-benar diakses, sehingga
 * tetap lazy meski gaya importnya terlihat seperti object biasa — pola yang
 * sama seperti `export const kv` di `packages/core/src/kv/client.ts`.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDbClient();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
