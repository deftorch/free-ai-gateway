import { db } from "@free-ai-gateway/database";
import { auditLogs } from "@free-ai-gateway/database";
import { runBackground } from "../utils/wait-until";

export type AdminActionType =
  | "KEY_CREATED"
  | "KEY_DELETED"
  | "TOKEN_CREATED"
  | "TOKEN_REVOKED"
  | "CANARY_UPDATED"
  | "CANARY_DELETED"
  | "CONFIG_IMPORTED"
  | "CHAOS_TOGGLED";

export interface LogAdminActionParams {
  action: AdminActionType;
  targetId?: string;
  actorHint?: string;
  details?: Record<string, unknown>;
}

/**
 * Mencatat riwayat aktivitas admin (Audit Log Trail) secara asinkron (non-blocking).
 */
export function logAdminAction(params: LogAdminActionParams): void {
  const auditPromise = (async () => {
    try {
      await db.insert(auditLogs).values({
        action: params.action,
        targetId: params.targetId || null,
        actorHint: params.actorHint || "admin",
        details: params.details || {},
      });
    } catch (err) {
      console.error("[audit] Gagal menyimpan audit log:", err);
    }
  })();

  runBackground(auditPromise);
}
