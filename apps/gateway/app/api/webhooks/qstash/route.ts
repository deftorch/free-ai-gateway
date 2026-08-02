import { logRequest } from "@free-ai-gateway/core";
import { recordTokenUsage } from "@free-ai-gateway/core";
import { type RequestCompletedEvent } from "@free-ai-gateway/core";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

/**
 * Handler Webhook QStash
 * Hanya bisa dipanggil oleh Upstash (diverifikasi lewat QSTASH_CURRENT_SIGNING_KEY)
 */
async function handler(req: Request) {
  try {
    const body = await req.json();

    if (body.type === "request.completed") {
      const data = body.data as RequestCompletedEvent;
      
      // 1. Eksekusi Pencatatan Log
      await logRequest({
        gatewayTokenId: data.gatewayTokenId,
        modelRequested: data.modelRequested,
        modelUsed: data.modelUsed,
        keyId: data.keyId,
        latencyMs: data.latencyMs,
        statusCode: data.statusCode,
        storeBody: data.storeBody,
        prompt: data.prompt,
      });

      // 2. Eksekusi Rekap Penggunaan (jika sukses)
      if (data.statusCode < 400) {
        await recordTokenUsage(data.gatewayTokenId).catch((err) => {
          console.error("[QStash] Gagal merekam token usage:", err);
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[QStash Webhook Error]:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Wrap handler dengan verifikasi keamanan QStash (fallback dummy key untuk lolos build time)
export const POST = verifySignatureAppRouter(handler, {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy_current_key_for_build",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy_next_key_for_build",
});
