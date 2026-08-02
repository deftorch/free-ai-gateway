import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  sendAlert,
  triggerCircuitBreakerAlert,
  triggerKeyDisabledAlert,
  triggerQuotaWarningAlert,
  triggerHealthProbeFailureAlert,
} from "./alerting";

describe("Webhook, Telegram, Email & WhatsApp Alerting Suite (Fase E)", () => {
  const originalFetch = global.fetch;
  let fetchCalls: Array<{ url: string; options: any }> = [];

  beforeEach(() => {
    fetchCalls = [];
    process.env.ALERT_WEBHOOK_URL = "https://example.com/webhook";
    process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
    process.env.TELEGRAM_CHAT_ID = "99887766";
    process.env.RESEND_API_KEY = "re_test_key_12345";
    process.env.ALERT_EMAIL_TO = "admin@example.com";
    process.env.WHATSAPP_API_URL = "https://whatsapp.gateway/send";
    process.env.ALERT_WHATSAPP_TO = "+6281234567890";

    global.fetch = mock((url: any, options: any) => {
      fetchCalls.push({ url: url.toString(), options });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      } as Response);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_EMAIL_TO;
    delete process.env.WHATSAPP_API_URL;
    delete process.env.ALERT_WHATSAPP_TO;
  });

  it("harus mengirim alert ke Webhook, Telegram, Email (Resend), dan WhatsApp secara bersamaan", async () => {
    await sendAlert({
      event: "circuit_breaker_triggered",
      timestamp: new Date().toISOString(),
      title: "Test Multi-Channel Alert",
      message: "Direct multi-channel test message",
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(fetchCalls.length).toBe(4);

    const webhookCall = fetchCalls.find((c) => c.url.includes("example.com"));
    expect(webhookCall).toBeDefined();

    const telegramCall = fetchCalls.find((c) => c.url.includes("api.telegram.org"));
    expect(telegramCall).toBeDefined();

    const resendCall = fetchCalls.find((c) => c.url.includes("api.resend.com"));
    expect(resendCall).toBeDefined();

    const waCall = fetchCalls.find((c) => c.url.includes("whatsapp.gateway"));
    expect(waCall).toBeDefined();
  });

  it("triggerCircuitBreakerAlert harus membuat payload circuit_breaker_triggered", async () => {
    await triggerCircuitBreakerAlert({
      keyId: "key-groq-123",
      providerId: "groq",
      failureStreak: 5,
      cooldownSeconds: 900,
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(fetchCalls.length).toBeGreaterThan(0);
    const webhookCall = fetchCalls.find((c) => c.url.includes("example.com"));
    const body = JSON.parse(webhookCall?.options.body);

    expect(body.event).toBe("circuit_breaker_triggered");
    expect(body.title).toContain("Circuit Breaker Triggered (groq)");
    expect(body.metadata.failureStreak).toBe(5);
  });

  it("triggerKeyDisabledAlert harus membuat payload key_disabled", async () => {
    await triggerKeyDisabledAlert({
      keyId: "key-openrouter-456",
      providerId: "openrouter",
      reason: "401 Invalid API key",
    });

    await new Promise((r) => setTimeout(r, 30));

    const webhookCall = fetchCalls.find((c) => c.url.includes("example.com"));
    const body = JSON.parse(webhookCall?.options.body);

    expect(body.event).toBe("key_disabled");
    expect(body.metadata.reason).toBe("401 Invalid API key");
  });

  it("triggerQuotaWarningAlert harus membuat payload quota_warning", async () => {
    await triggerQuotaWarningAlert({
      keyId: "key-cerebras-789",
      providerId: "cerebras",
      rpdUsed: 1350,
      rpdLimit: 1440,
    });

    await new Promise((r) => setTimeout(r, 30));

    const webhookCall = fetchCalls.find((c) => c.url.includes("example.com"));
    const body = JSON.parse(webhookCall?.options.body);

    expect(body.event).toBe("quota_warning");
    expect(body.title).toContain("Quota Warning 94%");
  });

  it("triggerHealthProbeFailureAlert harus membuat payload health_probe_failed", async () => {
    await triggerHealthProbeFailureAlert({
      providerId: "groq",
      modelId: "openai/gpt-oss-120b",
      error: "503 Service Unavailable",
    });

    await new Promise((r) => setTimeout(r, 30));

    const webhookCall = fetchCalls.find((c) => c.url.includes("example.com"));
    const body = JSON.parse(webhookCall?.options.body);

    expect(body.event).toBe("health_probe_failed");
    expect(body.message).toContain("503 Service Unavailable");
  });
});
