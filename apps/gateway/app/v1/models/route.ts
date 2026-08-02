import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { models, modelGroups } from "@free-ai-gateway/database";
import { verifyGatewayTokenDetailed } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * Format kompatibel OpenAI "list models" (bagian 9 dokumen desain).
 * Menggabungkan model individual + model groups (3.6) supaya dari sisi
 * client, grup terlihat seperti model biasa.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const authResult = await verifyGatewayTokenDetailed(authHeader);
  if (!authResult.valid) {
    return Response.json(
      { error: { message: authResult.error || "Token gateway tidak valid atau tidak ada.", type: "unauthorized" } },
      { status: authResult.statusCode }
    );
  }
  const authed = authResult.token;

  let activeModels = await db.select().from(models).where(eq(models.status, "active"));

  if (authed.allowedModels && Array.isArray(authed.allowedModels) && authed.allowedModels.length > 0) {
    const allowedPatterns = authed.allowedModels;
    activeModels = activeModels.filter(m => {
      const modelName = `${m.providerId}/${m.id}`;
      return allowedPatterns.some(pattern => {
        if (pattern === "*" || pattern === "all") return true;
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -2);
          return modelName.startsWith(`${prefix}/`);
        }
        return pattern === modelName;
      });
    });
  }
  const groups = await db.select().from(modelGroups);

  const data = [
    ...activeModels.map((m) => ({
      id: `${m.providerId}/${m.id}`,
      object: "model" as const,
      owned_by: m.providerId,
      context_window: m.contextWindow,
      tags: m.tags,
    })),
    ...groups.map((g) => ({
      id: `group/${g.id}`,
      object: "model" as const,
      owned_by: "model-group",
      strategy: g.strategy,
    })),
  ];

  return Response.json({ object: "list", data });
}
