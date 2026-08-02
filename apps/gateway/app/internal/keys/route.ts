import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { apiKeys } from "@free-ai-gateway/database";
import { encryptApiKey } from "@free-ai-gateway/core";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import { logAdminAction } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(apiKeys);
  const now = Date.now();

  return Response.json({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sengaja dibuang, jangan pernah kirim ciphertext ke client
    data: rows.map(({ keyEncrypted, ...rest }) => {
      const createdAtMs = rest.createdAt ? new Date(rest.createdAt).getTime() : now;
      const ageDays = Math.floor((now - createdAtMs) / (1000 * 60 * 60 * 24));
      return {
        ...rest,
        ageDays,
        needsRotation: ageDays >= 60,
      };
    }),
  });
}

export async function POST(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.providerId || !body?.label || !body?.rawKey) {
    return Response.json(
      { error: "Field 'providerId', 'label', dan 'rawKey' wajib ada." },
      { status: 400 }
    );
  }

  // Catatan (checklist §9.2): kalau providerId === 'google-ai-studio', ingatkan
  // user via UI dashboard untuk mengisi `quotaScopeHint` dengan id project GCP —
  // supaya terlihat jelas kalau dua key kebetulan berbagi kuota yang sama.
  const [inserted] = await db
    .insert(apiKeys)
    .values({
      providerId: body.providerId,
      label: body.label,
      keyEncrypted: await encryptApiKey(body.rawKey),
      quotaScopeHint: body.quotaScopeHint ?? null,
    })
    .returning();

  const insertedKey = inserted;

  logAdminAction({
    action: "KEY_CREATED",
    targetId: insertedKey?.id,
    details: { providerId: body.providerId, label: body.label },
  });

  return Response.json({ id: inserted.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Query param 'id' wajib ada." }, { status: 400 });

  await db.delete(apiKeys).where(eq(apiKeys.id, id));

  logAdminAction({
    action: "KEY_DELETED",
    targetId: id,
  });

  return Response.json({ deleted: id });
}
