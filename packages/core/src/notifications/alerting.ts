import { runBackground } from "../utils/wait-until";
import { getEnvVar, getEnvVarOrDefault } from "../config/env";

export type AlertEvent =
  | "circuit_breaker_triggered"
  | "key_disabled"
  | "quota_warning"
  | "health_probe_failed"
  | "model_deprecated";

export interface AlertPayload {
  event: AlertEvent;
  timestamp: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatch notification alert asynchronously across channels:
 * 1. Webhook (ALERT_WEBHOOK_URL)
 * 2. Telegram Bot (TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)
 * 3. Email via Resend HTTP API (RESEND_API_KEY & ALERT_EMAIL_TO)
 * 4. WhatsApp Gateway API (WHATSAPP_API_URL & ALERT_WHATSAPP_TO)
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  const alertPromise = (async () => {
    // 1. Generic Webhook Alerting
    const webhookUrl = getEnvVar("ALERT_WEBHOOK_URL");
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("[alerting] Gagal mengirim Webhook alert:", err);
      }
    }

    // 2. Telegram Bot Alerting
    const tgToken = getEnvVar("TELEGRAM_BOT_TOKEN");
    const tgChatId = getEnvVar("TELEGRAM_CHAT_ID");
    if (tgToken && tgChatId) {
      try {
        const text = `ALERT: ${payload.title}\n\n${payload.message}\n\nTimestamp: ${payload.timestamp}`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
          }),
        });
      } catch (err) {
        console.error("[alerting] Gagal mengirim Telegram alert:", err);
      }
    }

    // 3. Email Alerting (via Resend HTTP API)
    const resendApiKey = getEnvVar("RESEND_API_KEY");
    const emailTo = getEnvVar("ALERT_EMAIL_TO");
    const emailFrom = getEnvVarOrDefault("ALERT_EMAIL_FROM", "Free AI Gateway <alerts@resend.dev>");
    if (resendApiKey && emailTo) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [emailTo],
            subject: `[ALERT] ${payload.title}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #ef4444;">${payload.title}</h2>
                <p style="font-size: 16px; line-height: 1.5;">${payload.message}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Timestamp: ${payload.timestamp}</p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error("[alerting] Gagal mengirim Email alert via Resend:", err);
      }
    }

    // 4. WhatsApp Alerting (via Gateway API / Twilio / Fonnte / Whapi)
    const waUrl = getEnvVar("WHATSAPP_API_URL");
    const waToken = getEnvVar("WHATSAPP_API_TOKEN");
    const waTo = getEnvVar("ALERT_WHATSAPP_TO");
    if (waUrl && waTo) {
      try {
        const messageText = `*[ALERT: ${payload.title}]*\n\n${payload.message}\n\n_Timestamp: ${payload.timestamp}_`;
        await fetch(waUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(waToken ? { Authorization: `Bearer ${waToken}` } : {}),
          },
          body: JSON.stringify({
            target: waTo,
            message: messageText,
            phone: waTo,
            text: messageText,
          }),
        });
      } catch (err) {
        console.error("[alerting] Gagal mengirim WhatsApp alert:", err);
      }
    }
  })();

  runBackground(alertPromise);
}

/** Trigger alert when circuit breaker is tripped due to consecutive failures. */
export async function triggerCircuitBreakerAlert(params: {
  keyId: string;
  providerId: string;
  failureStreak: number;
  cooldownSeconds: number;
}) {
  await sendAlert({
    event: "circuit_breaker_triggered",
    timestamp: new Date().toISOString(),
    title: `Circuit Breaker Triggered (${params.providerId})`,
    message: `API Key '${params.keyId}' untuk provider '${params.providerId}' mengalami ${params.failureStreak} kegagalan beruntun. Cooldown dipasang selama ${params.cooldownSeconds} detik.`,
    metadata: params,
  });
}

/** Trigger alert when an API key is permanently disabled (e.g. 401/403 Invalid API key). */
export async function triggerKeyDisabledAlert(params: {
  keyId: string;
  providerId: string;
  reason: string;
}) {
  await sendAlert({
    event: "key_disabled",
    timestamp: new Date().toISOString(),
    title: `Key Disabled (${params.providerId})`,
    message: `API Key '${params.keyId}' untuk provider '${params.providerId}' telah di-disable secara permanen. Alasan: ${params.reason}`,
    metadata: params,
  });
}

/** Trigger alert when daily RPD quota reaches threshold (>= 90%). */
export async function triggerQuotaWarningAlert(params: {
  keyId: string;
  providerId: string;
  rpdUsed: number;
  rpdLimit: number;
}) {
  const percent = Math.round((params.rpdUsed / params.rpdLimit) * 100);
  await sendAlert({
    event: "quota_warning",
    timestamp: new Date().toISOString(),
    title: `Quota Warning ${percent}% (${params.providerId})`,
    message: `API Key '${params.keyId}' untuk provider '${params.providerId}' telah menggunakan ${params.rpdUsed}/${params.rpdLimit} kuota harian RPD (${percent}%).`,
    metadata: params,
  });
}

/** Trigger alert when health probe fails for a model. */
export async function triggerHealthProbeFailureAlert(params: {
  providerId: string;
  modelId: string;
  error: string;
}) {
  await sendAlert({
    event: "health_probe_failed",
    timestamp: new Date().toISOString(),
    title: `Health Probe Failed (${params.providerId}/${params.modelId})`,
    message: `Probing kesehatan model '${params.providerId}/${params.modelId}' gagal. Detail error: ${params.error}`,
    metadata: params,
  });
}

/** Trigger alert when a model in the catalog is marked as deprecated / tombstoned (EOL). */
export async function triggerModelDeprecatedAlert(params: {
  modelId: string;
  providerId: string;
  reason?: string;
}) {
  await sendAlert({
    event: "model_deprecated",
    timestamp: new Date().toISOString(),
    title: `Model Deprecated / Tombstoned (${params.modelId})`,
    message: `Model '${params.modelId}' pada provider '${params.providerId}' telah di-tombstone (deprecated/EOL). Request ke model ini akan dialihkan ke target failover. ${params.reason ? `Detail: ${params.reason}` : ""}`,
    metadata: params,
  });
}
