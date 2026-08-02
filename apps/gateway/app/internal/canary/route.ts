import { kv, kvKeys } from "@free-ai-gateway/core";
import { verifyInternalAdminToken, logAdminAction } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export interface CanaryRule {
  groupName: string;
  mainModel: string;
  canaryModel: string;
  canaryWeight: number; // 1 - 99 (%)
  createdAt?: string;
}

/**
 * GET /internal/canary
 * Mengambil aturan canary routing yang aktif (misal untuk group 'kode-terbaik' atau 'auto').
 */
export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupName = searchParams.get("groupName") || "kode-terbaik";

  try {
    const rule = await kv.get<CanaryRule>(kvKeys.canaryRule(groupName));
    return Response.json({
      groupName,
      rule: rule || null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /internal/canary
 * Menyimpan atau memperbarui aturan canary traffic splitting.
 * Body: { groupName: string, mainModel: string, canaryModel: string, canaryWeight: number }
 */
export async function POST(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { groupName, mainModel, canaryModel, canaryWeight } = body;

    if (!groupName || !mainModel || !canaryModel || typeof canaryWeight !== "number") {
      return Response.json(
        { error: "Parameter 'groupName', 'mainModel', 'canaryModel', dan 'canaryWeight' wajib diisi." },
        { status: 400 }
      );
    }

    const weight = Math.min(99, Math.max(1, canaryWeight));

    const rule: CanaryRule = {
      groupName,
      mainModel,
      canaryModel,
      canaryWeight: weight,
      createdAt: new Date().toISOString(),
    };

    await kv.set(kvKeys.canaryRule(groupName), rule);

    logAdminAction({
      action: "CANARY_UPDATED",
      targetId: groupName,
      details: { mainModel, canaryModel, canaryWeight: weight },
    });

    return Response.json({
      message: `Berhasil mengaktifkan Canary Rule ${weight}% traffic untuk group '${groupName}'`,
      rule,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /internal/canary
 * Menghapus/menonaktifkan aturan canary traffic splitting.
 */
export async function DELETE(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupName = searchParams.get("groupName");

  if (!groupName) {
    return Response.json({ error: "Query param 'groupName' wajib diisi." }, { status: 400 });
  }

  try {
    await kv.del(kvKeys.canaryRule(groupName));
    logAdminAction({
      action: "CANARY_DELETED",
      targetId: groupName,
    });

    return Response.json({
      message: `Aturan canary untuk group '${groupName}' berhasil dinonaktifkan.`,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
