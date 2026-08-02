import { getSecondsUntilUTCMidnight } from "../kv/client";
import type { gatewayTokens } from "@free-ai-gateway/database";

/**
 * Utility untuk menyisipkan Standard Rate-Limit HTTP Response Headers (RFC 6585)
 * - X-RateLimit-Limit-Requests
 * - X-RateLimit-Remaining-Requests
 * - X-RateLimit-Reset
 */
export function addRateLimitHeaders(
  response: Response,
  token?: typeof gatewayTokens.$inferSelect | null,
  usedCount: number = 0
): Response {
  const headers = new Headers(response.headers);

  const maxLimit = token?.maxDailyRequests || 10000;
  const remaining = Math.max(0, maxLimit - usedCount);
  const resetSeconds = getSecondsUntilUTCMidnight();

  headers.set("X-RateLimit-Limit-Requests", String(maxLimit));
  headers.set("X-RateLimit-Remaining-Requests", String(remaining));
  headers.set("X-RateLimit-Reset", String(resetSeconds));
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
