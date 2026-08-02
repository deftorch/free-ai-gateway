import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { requestLogs, requestBodies, gatewayTokens } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * Endpoint internal Log Explorer (/internal/logs).
 * Mendukung pagination, filter status code, model, token, dan include body payload.
 */
export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const statusCodeParam = searchParams.get("statusCode");
  const modelRequested = searchParams.get("modelRequested");
  const gatewayTokenId = searchParams.get("gatewayTokenId");
  const includeBody = searchParams.get("includeBody") === "true";

  const conditions = [];
  if (statusCodeParam) {
    const code = parseInt(statusCodeParam, 10);
    if (!isNaN(code)) {
      conditions.push(eq(requestLogs.statusCode, code));
    }
  }
  if (modelRequested) {
    conditions.push(eq(requestLogs.modelRequested, modelRequested));
  }
  if (gatewayTokenId) {
    conditions.push(eq(requestLogs.gatewayTokenId, gatewayTokenId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const logs = await db
      .select({
        id: requestLogs.id,
        timestamp: requestLogs.timestamp,
        gatewayTokenId: requestLogs.gatewayTokenId,
        projectLabel: gatewayTokens.projectLabel,
        modelRequested: requestLogs.modelRequested,
        modelUsed: requestLogs.modelUsed,
        keyId: requestLogs.keyId,
        latencyMs: requestLogs.latencyMs,
        statusCode: requestLogs.statusCode,
        tokensIn: requestLogs.tokensIn,
        tokensOut: requestLogs.tokensOut,
      })
      .from(requestLogs)
      .leftJoin(gatewayTokens, eq(requestLogs.gatewayTokenId, gatewayTokens.id))
      .where(whereClause)
      .orderBy(desc(requestLogs.timestamp))
      .limit(limit)
      .offset(offset);

    // If payload body is requested, fetch bodies for these logs
    const resultLogs = await Promise.all(
      logs.map(async (log) => {
        let body = null;
        if (includeBody) {
          const [b] = await db
            .select({ prompt: requestBodies.prompt, response: requestBodies.response })
            .from(requestBodies)
            .where(eq(requestBodies.requestLogId, log.id))
            .limit(1)
            .catch(() => []);
          body = b || null;
        }
        return {
          ...log,
          body,
        };
      })
    );

    return Response.json({
      data: resultLogs,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    return Response.json({ data: [], error: (error as Error).message }, { status: 500 });
  }
}
