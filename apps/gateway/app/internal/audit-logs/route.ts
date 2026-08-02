import { db } from "@free-ai-gateway/database";
import { auditLogs } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /internal/audit-logs
 * Mengembalikan daftar riwayat aktivitas admin (Audit Trail Log) dengan pagination.
 */
export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

    let logs: Array<typeof auditLogs.$inferSelect> = [];
    try {
      logs = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);
    } catch (dbErr) {
      return Response.json({ logs: [], queryFailed: true, error: String(dbErr) }, { status: 500 });
    }

    return Response.json({ logs });
  } catch (error) {
    return Response.json({ logs: [], queryFailed: true, error: String(error) }, { status: 500 });
  }
}
