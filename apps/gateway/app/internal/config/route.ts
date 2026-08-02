import { db } from "@free-ai-gateway/database";
import { modelGroups, gatewayTokens, models } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * GET /internal/config
 * Mengekspor seluruh konfigurasi gateway (Model Groups, Token Policies, Model Reviews)
 * sebagai objek JSON yang aman (tidak mengandung API Key mentah).
 */
export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const groups = await db.select().from(modelGroups).catch(() => []);
    const tokens = await db
      .select({
        id: gatewayTokens.id,
        projectLabel: gatewayTokens.projectLabel,
        allowedModels: gatewayTokens.allowedModels,
        maxDailyRequests: gatewayTokens.maxDailyRequests,
        storeBody: gatewayTokens.storeBody,
        status: gatewayTokens.status,
      })
      .from(gatewayTokens)
      .catch(() => []);

    const modelCatalog = await db
      .select({
        id: models.id,
        providerId: models.providerId,
        displayName: models.displayName,
        tags: models.tags,
        needsReview: models.needsReview,
        status: models.status,
      })
      .from(models)
      .catch(() => []);

    const configPayload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      modelGroups: groups,
      gatewayTokens: tokens,
      modelsCatalog: modelCatalog,
    };

    return Response.json(configPayload, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="free-ai-gateway-config-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /internal/config
 * Mengimpor/melakukan pemulihan konfigurasi dari file JSON yang diunggah.
 */
export async function POST(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "JSON Payload tidak valid." }, { status: 400 });
    }

    let restoredGroupsCount = 0;

    // Restore / Upsert Model Groups if present
    if (Array.isArray(body.modelGroups)) {
      for (const group of body.modelGroups) {
        if (group.id && group.name && Array.isArray(group.members)) {
          const strategyVal = String(group.strategy || "ordered");
          const membersVal = group.members as Array<{ modelId: string; weight?: number; priority?: number }>;

          await db
            .insert(modelGroups)
            .values({
              id: String(group.id),
              strategy: strategyVal,
              members: membersVal,
            })
            .onConflictDoUpdate({
              target: modelGroups.id,
              set: {
                strategy: strategyVal,
                members: membersVal,
              },
            })
            .catch(() => null);
          restoredGroupsCount++;
        }
      }
    }

    return Response.json({
      message: "Impor konfigurasi berhasil diproses.",
      restored: {
        modelGroupsCount: restoredGroupsCount,
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
