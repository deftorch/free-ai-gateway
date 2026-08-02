import { eq } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { models } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const needsReviewOnly = searchParams.get("needsReview") === "true";

  try {
    const query = db.select().from(models);
    const rows = needsReviewOnly
      ? await query.where(eq(models.needsReview, true)).catch(() => [])
      : await query.catch(() => []);

    return Response.json({ data: rows });
  } catch {
    return Response.json({ data: [] });
  }
}

export async function PATCH(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return Response.json({ error: "Field 'id' model wajib ada." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.status === "string" && ["active", "deprecated"].includes(body.status)) {
    updates.status = body.status;
  }

  if (typeof body.needsReview === "boolean") {
    updates.needsReview = body.needsReview;
  }

  if (typeof body.displayName === "string") {
    updates.displayName = body.displayName;
  }

  if (Array.isArray(body.tags)) {
    updates.tags = body.tags;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Tidak ada field valid yang diperbarui." }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(models)
      .set(updates)
      .where(eq(models.id, body.id))
      .returning();

    return Response.json({ data: updated });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
