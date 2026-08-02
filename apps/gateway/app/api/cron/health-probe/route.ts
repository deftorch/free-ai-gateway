import { verifyCronSecret } from "@free-ai-gateway/core";
import { db } from "@free-ai-gateway/database";
import { apiKeys, healthMetrics, models } from "@free-ai-gateway/database";
import { decryptApiKey } from "@free-ai-gateway/core";
import { getProviderAdapter } from "@free-ai-gateway/core";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron Handler: `health-probe`
 *
 * Mengirim probe ringan ke sampel key aktif per provider untuk mengukur latensi real-time,
 * status kesehatan, serta mencatat hasilnya ke tabel `health_metrics`.
 */
export async function GET(req: Request) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Ambil maksimal 10 key aktif secara acak/terbatas
  const activeKeys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.status, "active"))
    .limit(10);

  // Cache model aktif per provider agar probe memanggil model yang valid
  const activeModels = await db
    .select()
    .from(models)
    .where(eq(models.status, "active"));

  const providerModelMap = new Map<string, string>();
  for (const model of activeModels) {
    if (!providerModelMap.has(model.providerId)) {
      // Ambil ID model tanpa prefix "provider/"
      const rawModelId = model.id.includes("/")
        ? model.id.split("/").slice(1).join("/")
        : model.id;
      providerModelMap.set(model.providerId, rawModelId);
    }
  }

  const results: Array<{ keyId: string; providerId: string; success: boolean; latencyMs?: number; skipped?: boolean }> = [];

  for (const keyRow of activeKeys) {
    const isCustom = keyRow.providerId.startsWith("custom");

    // Source-Aware Probing: Local/Custom LLM node disampling 50% untuk hemat beban server/local GPU
    if (isCustom && Math.random() < 0.5) {
      results.push({ keyId: keyRow.id, providerId: keyRow.providerId, success: true, skipped: true });
      continue;
    }

    const adapter = getProviderAdapter(keyRow.providerId);
    const probeModel = providerModelMap.get(keyRow.providerId);
    if (!probeModel) {
      results.push({ keyId: keyRow.id, providerId: keyRow.providerId, success: true, skipped: true });
      continue;
    }

    const start = Date.now();
    try {
      const plainKey = await decryptApiKey(keyRow.keyEncrypted);
      const probeReq = adapter.buildRequest(plainKey, {
        model: probeModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });

      const res = await fetch(probeReq);
      const latencyMs = Date.now() - start;
      const success = res.ok;

      if (res.status === 410) {
        // Model EOL terdeteksi saat probe -> Pensiunkan otomatis
        await db
          .update(models)
          .set({ status: "deprecated", needsReview: true })
          .where(eq(models.id, `${keyRow.providerId}/${probeModel}`))
          .catch((e) => { console.error('[SilentError]', e); });
      }

      await db.insert(healthMetrics).values({
        modelId: `${keyRow.providerId}/${probeModel}`,
        keyId: keyRow.id,
        latencyMs,
        success,
        errorType: success ? null : `status_${res.status}`,
      });

      results.push({ keyId: keyRow.id, providerId: keyRow.providerId, success, latencyMs });
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errStr = String(err);
      if (errStr.includes("410") || errStr.includes("model_not_found")) {
        await db
          .update(models)
          .set({ status: "deprecated", needsReview: true })
          .where(eq(models.id, `${keyRow.providerId}/${probeModel}`))
          .catch((e) => { console.error('[SilentError]', e); });
      }

      await db.insert(healthMetrics).values({
        modelId: `${keyRow.providerId}/${probeModel}`,
        keyId: keyRow.id,
        latencyMs,
        success: false,
        errorType: errStr,
      });

      results.push({ keyId: keyRow.id, providerId: keyRow.providerId, success: false });
    }
  }

  return Response.json({ ok: true, probed: results.length, results });
}
