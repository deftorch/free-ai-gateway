import { db } from "@free-ai-gateway/database";
import { apiKeys, healthMetrics } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import { desc } from "drizzle-orm";
import { getProviderCapacityMetrics } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const keys = await db.select().from(apiKeys);
    const recentMetrics = await db
      .select()
      .from(healthMetrics)
      .orderBy(desc(healthMetrics.timestamp))
      .limit(200);

    const providerCapacity = await getProviderCapacityMetrics().catch(() => []);

    return Response.json({
      keys: keys.map((k) => ({
        id: k.id,
        providerId: k.providerId,
        label: k.label,
        status: k.status,
        cooldownUntil: k.cooldownUntil,
        errorCount: k.errorCount,
        lastUsedAt: k.lastUsedAt,
        // keyEncrypted SENGAJA tidak diikutkan di response.
      })),
      recentMetrics,
      providerCapacity,
    });
  } catch {
    return Response.json({ keys: [], recentMetrics: [], providerCapacity: [] });
  }
}
