import { createClient, type ClickHouseClient } from "@clickhouse/client";

import { getEnvVar, getEnvVarOrDefault } from "./config/env";

/**
 * Konfigurasi ClickHouse — dibaca lazy (lihat catatan DI di `client.ts` /
 * `packages/core/src/config/env.ts`), bukan di top-level saat modul
 * di-import, supaya `configureDatabaseEnv()` (Worker) sempat jalan dulu.
 */
function createClickHouseClient(): ClickHouseClient {
  const host = getEnvVarOrDefault("CLICKHOUSE_URL", "http://localhost:8123");
  const username = getEnvVarOrDefault("CLICKHOUSE_USER", "default");
  const password = getEnvVarOrDefault("CLICKHOUSE_PASSWORD", "");
  const database = getEnvVarOrDefault("CLICKHOUSE_DATABASE", "default");

  return createClient({
    url: host,
    username,
    password,
    database,
  });
}

let clickhouseSingleton: ClickHouseClient | null = null;

/** Ambil instance ClickHouse client (lazy singleton), lihat catatan di atas. */
export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseSingleton) {
    clickhouseSingleton = createClickHouseClient();
  }
  return clickhouseSingleton;
}

/**
 * Export `clickhouse` dipertahankan untuk kompatibilitas mundur. Sama seperti
 * `db` di `client.ts`, ini adalah `Proxy` yang menunda pembuatan instance
 * sungguhan sampai property pertama benar-benar diakses.
 */
export const clickhouse: ClickHouseClient = new Proxy({} as ClickHouseClient, {
  get(_target, prop, receiver) {
    const instance = getClickHouseClient();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/**
 * Helper untuk menyisipkan log ke ClickHouse dalam bentuk Batch (Praktik Terbaik OTel/Clickhouse)
 * Tidak boleh melakukan row-by-row insert di aplikasi dengan volume tinggi!
 */
export async function insertGatewayLogsBatch(logs: any[]) {
  if (!logs || logs.length === 0) return;

  if (getEnvVar("NODE_ENV") === "test") {
    console.log(`[ClickHouse] (Test Mode) Melewati insert ${logs.length} logs.`);
    return;
  }

  try {
    await getClickHouseClient().insert({
      table: "gateway_request_logs",
      values: logs,
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("[ClickHouse] Gagal melakukan batch insert logs:", error);
  }
}
