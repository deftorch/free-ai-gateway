import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import { kv, kvKeys, logAdminAction } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * Endpoint internal untuk mengontrol Chaos Engineering Outage Simulator (/internal/chaos).
 * Membutuhkan authorization: Bearer $INTERNAL_ADMIN_TOKEN.
 */
export async function POST(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const providerId = body?.providerId;
  const action = body?.action; // 'enable' | 'disable' | 'toggle'

  if (!providerId) {
    return Response.json({ error: "Field 'providerId' wajib ada." }, { status: 400 });
  }

  const redisKey = kvKeys.chaosOutage(providerId);
  const currentStatus = (await kv.get<boolean>(redisKey).catch(() => false)) || false;

  let newStatus = false;
  if (action === "enable") {
    newStatus = true;
  } else if (action === "disable") {
    newStatus = false;
  } else {
    newStatus = !currentStatus;
  }

  if (newStatus) {
    await kv.set(redisKey, true).catch((e) => { console.error('[SilentError]', e); });
  } else {
    await kv.del(redisKey).catch((e) => { console.error('[SilentError]', e); });
  }

  logAdminAction({
    action: "CHAOS_TOGGLED",
    targetId: providerId,
    details: { simulatedOutage: newStatus },
  });

  return Response.json({
    providerId,
    simulatedOutage: newStatus,
    message: newStatus
      ? `Simulated outage diaktifkan untuk provider '${providerId}'. Traffic akan otomatis failover.`
      : `Simulated outage dinonaktifkan untuk provider '${providerId}'.`,
  });
}
