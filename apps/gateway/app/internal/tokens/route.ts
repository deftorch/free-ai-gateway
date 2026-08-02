import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { gatewayTokens } from "@free-ai-gateway/database";
import { generateGatewayToken } from "@free-ai-gateway/core";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * Endpoint internal untuk manajemen Token Gateway (`/internal/tokens`).
 * Membutuhkan `Authorization: Bearer $INTERNAL_ADMIN_TOKEN`.
 */

import { kv, kvKeys, getTodayUTCDateString } from "@free-ai-gateway/core";
import { logAdminAction } from "@free-ai-gateway/core";

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(gatewayTokens).catch(() => []);
  const today = getTodayUTCDateString();

  const data = await Promise.all(
    rows.map(async (row) => {
      const usedToday = (await kv.get<number>(kvKeys.tokenRpdCount(row.id, today)).catch(() => null)) || 0;
      return {
        ...row,
        usedToday,
      };
    })
  );

  return Response.json({ data });
}

export async function POST(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.projectLabel) {
    return Response.json(
      { error: "Field 'projectLabel' wajib ada." },
      { status: 400 }
    );
  }

  const { rawToken, tokenHash } = await generateGatewayToken();
  const storeBody = body.storeBody ?? true;

  let allowedModels: string[] | null = null;
  if (Array.isArray(body.allowedModels) && body.allowedModels.length > 0) {
    allowedModels = body.allowedModels.map((m: string) => m.trim()).filter(Boolean);
  }

  const maxDailyRequests =
    typeof body.maxDailyRequests === "number" && body.maxDailyRequests > 0
      ? Math.floor(body.maxDailyRequests)
      : null;

  let inserted;
  try {
    const result = await db
      .insert(gatewayTokens)
      .values({
        projectLabel: body.projectLabel,
        tokenHash,
        storeBody,
        allowedModels,
        maxDailyRequests,
        status: "active",
      })
      .returning();
    inserted = Array.isArray(result) ? result[0] : result;
  } catch (error) {
    return Response.json(
      { error: "Gagal menyimpan token ke database." },
      { status: 500 }
    );
  }

  const tokenRecord = inserted;

  logAdminAction({
    action: "TOKEN_CREATED",
    targetId: tokenRecord?.id,
    details: { projectLabel: body.projectLabel, maxDailyRequests },
  });

  return Response.json(
    {
      id: inserted.id,
      projectLabel: body.projectLabel,
      storeBody,
      allowedModels,
      maxDailyRequests,
      rawToken,
      createdAt: inserted.createdAt,
      message: "Simpan rawToken ini sekarang. Token plaintext tidak dapat ditampilkan kembali.",
    },
    { status: 201 }
  );
}

export async function DELETE(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Query param 'id' wajib ada." }, { status: 400 });
  }

  await db.delete(gatewayTokens).where(eq(gatewayTokens.id, id)).catch((e) => { console.error('[SilentError]', e); });

  logAdminAction({
    action: "TOKEN_REVOKED",
    targetId: id,
  });

  return Response.json({ deleted: id });
}
