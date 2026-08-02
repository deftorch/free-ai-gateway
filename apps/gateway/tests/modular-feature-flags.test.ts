import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getEnabledProviders, isProviderEnabled, featureFlags } from "@free-ai-gateway/core";
import { POST as discoverPOST } from "../app/api/internal/discover/route";
import { GET as mcpGET, POST as mcpPOST } from "../app/api/mcp/route";

describe("3-Tier Modularity & Feature Flags Suite (ENABLE_* & ENABLED_PROVIDERS)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Lapis 1 — Provider Allowlist (ENABLED_PROVIDERS)", () => {
    it("harus mengembalikan semua provider terdaftar jika ENABLED_PROVIDERS tidak disetel", () => {
      delete process.env.ENABLED_PROVIDERS;
      const providers = getEnabledProviders();
      expect(providers.length).toBeGreaterThan(10);
      expect(isProviderEnabled("groq")).toBe(true);
      expect(isProviderEnabled("google-ai-studio")).toBe(true);
    });

    it("harus menyaring hanya provider yang di-allowlist jika ENABLED_PROVIDERS disetel", () => {
      process.env.ENABLED_PROVIDERS = "groq, google-ai-studio";
      const providers = getEnabledProviders();
      expect(providers).toEqual(["groq", "google-ai-studio"]);

      expect(isProviderEnabled("groq")).toBe(true);
      expect(isProviderEnabled("google-ai-studio")).toBe(true);
      expect(isProviderEnabled("cerebras")).toBe(false);
      expect(isProviderEnabled("openrouter")).toBe(false);
    });

    it("harus selalu mengizinkan provider custom atau url", () => {
      process.env.ENABLED_PROVIDERS = "groq";
      expect(isProviderEnabled("custom-ollama")).toBe(true);
      expect(isProviderEnabled("http://localhost:11434")).toBe(true);
    });
  });

  describe("Lapis 2 — Feature Flags Runtime Engine", () => {
    it("harus mendeteksi status default (true) untuk seluruh feature flags", () => {
      delete process.env.ENABLE_DASHBOARD;
      delete process.env.ENABLE_DISCOVERY;
      delete process.env.ENABLE_SMART_ROUTING;
      delete process.env.ENABLE_MCP_SERVER;

      expect(featureFlags.isDashboardEnabled()).toBe(true);
      expect(featureFlags.isDiscoveryEnabled()).toBe(true);
      expect(featureFlags.isSmartRoutingEnabled()).toBe(true);
      expect(featureFlags.isMcpServerEnabled()).toBe(true);
    });

    it("harus mendeteksi flag 'false' saat variabel disetel ke 'false'", () => {
      process.env.ENABLE_DASHBOARD = "false";
      process.env.ENABLE_DISCOVERY = "false";
      process.env.ENABLE_SMART_ROUTING = "false";
      process.env.ENABLE_MCP_SERVER = "false";

      expect(featureFlags.isDashboardEnabled()).toBe(false);
      expect(featureFlags.isDiscoveryEnabled()).toBe(false);
      expect(featureFlags.isSmartRoutingEnabled()).toBe(false);
      expect(featureFlags.isMcpServerEnabled()).toBe(false);
    });

    it("harus menolak request discovery (403 Forbidden) jika ENABLE_DISCOVERY=false", async () => {
      process.env.ENABLE_DISCOVERY = "false";
      const req = new Request("http://localhost/api/internal/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: "http://localhost:11434/v1" }),
      });
      const res = await discoverPOST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error?.type).toBe("feature_disabled");
    });

    it("harus menolak request MCP server (503 Service Unavailable) jika ENABLE_MCP_SERVER=false", async () => {
      process.env.ENABLE_MCP_SERVER = "false";

      const getReq = new Request("http://localhost/api/mcp", { method: "GET" });
      const getRes = await mcpGET(getReq);
      expect(getRes.status).toBe(503);

      const postReq = new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      const postRes = await mcpPOST(postReq);
      expect(postRes.status).toBe(503);
    });
  });
});
