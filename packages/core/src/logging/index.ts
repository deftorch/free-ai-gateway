import { db } from "@free-ai-gateway/database";
import { requestLogs, requestBodies } from "@free-ai-gateway/database";
import { runBackground } from "../utils/wait-until";

export interface LogRequestParams {
  gatewayTokenId?: string;
  modelRequested: string;
  modelUsed?: string;
  keyId?: string;
  latencyMs?: number;
  statusCode: number;
  tokensIn?: number;
  tokensOut?: number;
  storeBody?: boolean;
  prompt?: unknown;
  response?: unknown;
}

/**
 * Encapsulates async request logging to `request_logs` & `request_bodies`.
 * Universal cross-platform non-blocking execution (Vercel, Netlify, Docker, VPS).
 */
export async function logRequest(params: LogRequestParams): Promise<void> {
  const logPromise = (async () => {
    try {
      let insertedLog: { id: string } | undefined = undefined;
      try {
        const result = await db
          .insert(requestLogs)
          .values({
            gatewayTokenId: params.gatewayTokenId,
            modelRequested: params.modelRequested,
            modelUsed: params.modelUsed,
            keyId: params.keyId,
            latencyMs: params.latencyMs,
            statusCode: params.statusCode,
            tokensIn: params.tokensIn,
            tokensOut: params.tokensOut,
          })
          .returning();
        insertedLog = result[0];
      } catch {
        insertedLog = undefined;
      }

      if (insertedLog?.id && params.storeBody && (params.prompt || params.response)) {
        await db
          .insert(requestBodies)
          .values({
            requestLogId: insertedLog.id,
            prompt: params.prompt ? (params.prompt as Record<string, unknown>) : null,
            response: params.response ? (params.response as Record<string, unknown>) : null,
          })
          .catch((err: any) => {
            console.error("[logging] Gagal menyimpan log request_bodies:", err);
          });
      }
    } catch (err) {
      console.error("[logging] Gagal menyimpan log request_logs:", err);
    }
  })();

  runBackground(logPromise);
}
