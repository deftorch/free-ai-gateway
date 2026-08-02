import { verifyCronSecret } from "@free-ai-gateway/core";
import { db } from "@free-ai-gateway/database";
import { models } from "@free-ai-gateway/database";
import { eq, inArray } from "drizzle-orm";
import { fetchFreeLlmResourcesCatalog } from "@free-ai-gateway/core";
import { triggerModelDeprecatedAlert } from "@free-ai-gateway/core";

export const runtime = "nodejs";
export const maxDuration = 60;

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

/**
 * Cron Handler: `update-catalog`
 *
 * Menarik daftar model dari OpenRouter API (`/api/v1/models`) dan `free-llm-api-resources` README,
 * membandingkan dengan DB lokal (`models`), dan memperbarui katalog:
 * 1. Menambahkan model baru dari OpenRouter.
 * 2. Memperbarui model eksisting jika ada perubahan parameter.
 * 3. Menandai model lama yang hilang dari API sebagai `status = 'deprecated'` dan `needsReview = true`.
 * 4. (Masa depan) Akan memverifikasi model non-OpenRouter (Google/Groq) terhadap sinyal sekunder. Saat ini HANYA OpenRouter.
 */
export async function GET(req: Request) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) {
      return Response.json(
        { ok: false, error: `OpenRouter API status ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const fetchedModels: OpenRouterModel[] = json.data ?? [];

    // Ambil semua model OpenRouter yang ada di DB lokal saat ini
    const existingDbModels = await db
      .select()
      .from(models)
      .where(eq(models.providerId, "openrouter"));

    const existingMap = new Map(existingDbModels.map((m) => [m.id, m]));
    const fetchedIds = new Set<string>();

    let addedCount = 0;
    let updatedCount = 0;

    for (const remote of fetchedModels) {
      // Di gateway, model ID berformat provider/model
      const modelId = remote.id.startsWith("openrouter/")
        ? remote.id
        : `openrouter/${remote.id}`;

      fetchedIds.add(modelId);

      const contextWindow = remote.context_length ?? null;
      const inputPrice = remote.pricing?.prompt ?? "0";
      const outputPrice = remote.pricing?.completion ?? "0";
      const displayName = remote.name || remote.id;

      const existing = existingMap.get(modelId);

      if (!existing) {
        // Model baru ditemukan!
        await db.insert(models).values({
          id: modelId,
          providerId: "openrouter",
          displayName,
          contextWindow,
          inputPrice,
          outputPrice,
          status: "active",
          needsReview: false,
        });
        addedCount++;
      } else {
        // Cek apakah ada perubahan harga atau context window
        const isContextChanged = existing.contextWindow !== contextWindow;
        const isInputPriceChanged = existing.inputPrice !== inputPrice;
        const isOutputPriceChanged = existing.outputPrice !== outputPrice;

        if (isContextChanged || isInputPriceChanged || isOutputPriceChanged) {
          await db
            .update(models)
            .set({
              displayName,
              contextWindow,
              inputPrice,
              outputPrice,
              needsReview: true, // Tandai needsReview jika ada perubahan parameter
            })
            .where(eq(models.id, modelId));
          updatedCount++;
        } else if (existing.status === "deprecated") {
          // Jika model aktif kembali di API
          await db
            .update(models)
            .set({ status: "active", needsReview: false })
            .where(eq(models.id, modelId));
          updatedCount++;
        }
      }
    }

    // Deteksi model yang hilang dari API
    const deprecatedIds: string[] = [];
    for (const [id, dbModel] of existingMap.entries()) {
      if (!fetchedIds.has(id) && dbModel.status !== "deprecated") {
        deprecatedIds.push(id);
      }
    }

    if (deprecatedIds.length > 0) {
      await db
        .update(models)
        .set({ status: "deprecated", needsReview: true })
        .where(inArray(models.id, deprecatedIds));

      // Trigger Webhook & Multi-Channel Alerting untuk setiap model yang di-deprecated (tombstoned)
      for (const depId of deprecatedIds) {
        const providerId = depId.split("/")[0] || "openrouter";
        triggerModelDeprecatedAlert({
          modelId: depId,
          providerId,
          reason: "Model hilang dari daftar endpoint resmi provider (EOL).",
        });
      }
    }

    results.openrouter = {
      totalFetched: fetchedModels.length,
      added: addedCount,
      updated: updatedCount,
      deprecated: deprecatedIds.length,
    };
  } catch (err) {
    results.openrouter = { error: String(err) };
  }

  // --- Sinyal Pembanding Sekunder: free-llm-api-resources README diff ---
  try {
    const secondaryCatalog = await fetchFreeLlmResourcesCatalog();
    results.freeLlmResources = {
      providersCount: secondaryCatalog.length,
      status: "synced",
    };
  } catch (err) {
    results.freeLlmResources = { error: String(err) };
  }

  return Response.json({ ok: true, results });
}

