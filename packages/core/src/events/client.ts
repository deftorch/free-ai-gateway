import { Client } from "@upstash/qstash";
import { getEnvVar, getEnvVarOrDefault } from "../config/env";

// Inisialisasi QStash Client secara LAZY (bukan di top-level saat import).
// Ini penting untuk DI: modul ini bisa di-import sebelum runtime (mis. Worker)
// sempat memanggil `configureCoreEnv()`, jadi konstruksi client tidak boleh
// membaca env di waktu import — harus ditunda sampai benar-benar dipakai.
let qstashClient: Client | null = null;
function getQstashClient(): Client {
  if (!qstashClient) {
    qstashClient = new Client({
      token: getEnvVarOrDefault("QSTASH_TOKEN", "mock_token_for_tests"),
    });
  }
  return qstashClient;
}

/** @deprecated Gunakan `getQstashClient()` — export ini dipertahankan untuk kompatibilitas. */
export const qstash = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    return Reflect.get(getQstashClient(), prop, receiver);
  },
});

export interface RequestCompletedEvent {
  gatewayTokenId: string;
  modelRequested: string;
  modelUsed: string;
  keyId?: string;
  latencyMs: number;
  statusCode: number;
  storeBody: boolean;
  prompt: any;
}

/**
 * Memancarkan event 'request.completed' ke antrean background.
 */
export async function emitRequestCompleted(payload: RequestCompletedEvent) {
  // Jika sedang testing, jangan pancarkan event
  if (getEnvVar("NODE_ENV") === "test") {
    console.log("[EventBus] (Test Mode) Mencegah pengiriman event QStash.");
    return;
  }

  try {
    const gatewayUrl = getEnvVarOrDefault("NEXT_PUBLIC_GATEWAY_URL", "http://localhost:3000");
    await getQstashClient().publishJSON({
      url: `${gatewayUrl}/api/webhooks/qstash`,
      body: {
        type: "request.completed",
        data: payload,
      },
      // Mengirim pesan secara asynchronous background di Edge/Serverless Next.js
    });
  } catch (error) {
    console.error("[EventBus] Gagal memancarkan event QStash:", error);
    // Kita tidak throw error agar tidak mengganggu respon router
  }
}
