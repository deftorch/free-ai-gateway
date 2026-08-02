"use client";

import React, { useState, useEffect } from "react";
import { ApiKeyRow, GatewayTokenRow, ModelRow, HealthMetrics, LogEntry, TelemetrySnapshot, TimeseriesPoint, LeaderboardEntry, AuditLogEntry, DiscoveryResult, CanaryRule } from "./types";
import OverviewTab from "./components/OverviewTab";
import KeysTab from "./components/KeysTab";
import TokensTab from "./components/TokensTab";
import ModelsTab from "./components/ModelsTab";
import RoutingTab from "./components/RoutingTab";
import DiscoveryTab from "./components/DiscoveryTab";
import PlaygroundTab from "./components/PlaygroundTab";
import LogsTab from "./components/LogsTab";

function detectDashboardTaskCategory(prompt: string): "vision" | "coding" | "general" {
  const text = prompt.toLowerCase();
  if (text.includes("data:image/") || text.includes("gambar") || text.includes("foto")) {
    return "vision";
  } else if (
    text.includes("```") ||
    /\b(function|def |class |import |const |let |var |typescript|python|code|script|bug)\b/i.test(text)
  ) {
    return "coding";
  }
  return "general";
}

export default function DashboardPage() {
  const [adminToken, setAdminToken] = useState("");
  const [showAdvancedTabs, setShowAdvancedTabs] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "keys" | "tokens" | "models" | "routing" | "discovery" | "playground" | "logs"
  >("overview");

  // Health & Telemetry State
  const [healthData, setHealthData] = useState<HealthMetrics | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);

  // Keys State
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [newKeyProvider, setNewKeyProvider] = useState("groq");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyRaw, setNewKeyRaw] = useState("");
  const [newKeyHint, setNewKeyHint] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");

  // Gateway Tokens State
  const [tokens, setTokens] = useState<GatewayTokenRow[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenStoreBody, setNewTokenStoreBody] = useState(true);
  const [newTokenAllowedModels, setNewTokenAllowedModels] = useState("");
  const [newTokenMaxDaily, setNewTokenMaxDaily] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null);
  const [selectedConfigTool, setSelectedConfigTool] = useState("hermes-agent");

  // Catalog Models State
  const [catalogModels, setCatalogModels] = useState<ModelRow[]>([]);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logStatusCode, setLogStatusCode] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [selectedLogBody, setSelectedLogBody] = useState<LogEntry | null>(null);

  // Playground State
  const [pgModel, setPgModel] = useState("auto");
  const [pgSystem, setPgSystem] = useState("You are a helpful AI assistant.");
  const [pgUserPrompt, setPgUserPrompt] = useState("Halo, ceritakan tentang kelebihan AI gateway!");
  const [pgResponse, setPgResponse] = useState("");
  const [pgLoading, setPgLoading] = useState(false);
  const [pgLatency, setPgLatency] = useState<number | null>(null);

  // Auto-Discovery State
  const [discBaseUrl, setDiscBaseUrl] = useState("http://localhost:11434/v1");
  const [discLabel, setDiscLabel] = useState("Ollama Local Node");
  const [discApiKey, setDiscApiKey] = useState("");
  const [discLoading, setDiscLoading] = useState(false);
  const [discResult, setDiscResult] = useState<DiscoveryResult | null>(null);
  const [discError, setDiscError] = useState("");

  // Smart Router Classifier State
  const [testPrompt, setTestPrompt] = useState("Tolong buatkan fungsi TypeScript untuk mengurutkan array of object.");

  // Canary Traffic Splitting Control State
  const [canaryGroup, setCanaryGroup] = useState("kode-terbaik");
  const [canaryMainModel, setCanaryMainModel] = useState("groq/openai/gpt-oss-120b");
  const [canaryCandidateModel, setCanaryCandidateModel] = useState("openrouter/qwen/qwen3-coder:free");
  const [canaryWeight, setCanaryWeight] = useState(20);
  const [canaryActiveRule, setCanaryActiveRule] = useState<CanaryRule | null>(null);
  const [canaryMsg, setCanaryMsg] = useState("");

  // Analytics & Leaderboard & Audit State
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>([]);

  // Chaos Simulator State
  const [chaosLoading, setChaosLoading] = useState<string | null>(null);

  const detectedTask = detectDashboardTaskCategory(testPrompt);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/internal/health", {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setHealthData(json);
      }
    } catch {}
  };

  const handleToggleChaos = async (providerId: string, currentChaos?: boolean) => {
    if (!adminToken) return;
    setChaosLoading(providerId);
    try {
      const res = await fetch("/internal/chaos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          providerId,
          active: !currentChaos,
        }),
      });
      if (res.ok) {
        fetchHealth();
      }
    } catch {} finally {
      setChaosLoading(null);
    }
  };

  const fetchKeys = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch("/internal/keys", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setKeys(json.keys || []);
      }
    } catch {}
  };

  const fetchTokens = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch("/internal/tokens", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTokens(json.tokens || []);
      }
    } catch {}
  };

  const fetchModels = async () => {
    try {
      const url = filterNeedsReview ? "/internal/models?needsReview=true" : "/internal/models";
      const res = await fetch(url, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setCatalogModels(json.models || []);
      }
    } catch {}
  };

  const fetchLogs = async () => {
    if (!adminToken) return;
    setLogLoading(true);
    try {
      const url = logStatusCode ? `/internal/logs?statusCode=${logStatusCode}` : "/internal/logs";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch {} finally {
      setLogLoading(false);
    }
  };

  const fetchCanary = async () => {
    if (!adminToken || !canaryGroup) return;
    try {
      const res = await fetch(`/internal/canary?modelGroup=${encodeURIComponent(canaryGroup)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCanaryActiveRule(json.rule || null);
      }
    } catch {}
  };

  const handleSaveCanary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !canaryGroup) return;
    setCanaryMsg("");
    try {
      const res = await fetch("/internal/canary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          modelGroup: canaryGroup,
          mainModel: canaryMainModel,
          canaryModel: canaryCandidateModel,
          canaryWeight: canaryWeight,
        }),
      });
      if (res.ok) {
        setCanaryMsg("Rule Canary Split berhasil disimpan!");
        fetchCanary();
      }
    } catch {}
  };

  const handleRemoveCanary = async () => {
    if (!adminToken || !canaryGroup) return;
    try {
      const res = await fetch(`/internal/canary?modelGroup=${encodeURIComponent(canaryGroup)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setCanaryMsg("Rule Canary berhasil dihapus.");
        setCanaryActiveRule(null);
      }
    } catch {}
  };

  const handleExportConfig = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch("/internal/backup/export", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `free-ai-gateway-config-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch {}
  };

  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!adminToken || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const payload = JSON.parse(evt.target?.result as string);
        const res = await fetch("/internal/backup/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          alert("Import konfigurasi berhasil!");
          fetchKeys();
          fetchTokens();
          fetchModels();
          fetchHealth();
        } else {
          alert("Gagal mengimpor konfigurasi JSON.");
        }
      } catch {
        alert("File JSON tidak valid.");
      }
    };
    reader.readAsText(file);
  };

  const fetchTimeseries = async () => {
    try {
      const res = await fetch("/internal/analytics/timeseries", {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setTimeseries(json.timeseries || []);
      }
    } catch {}
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/internal/leaderboard", {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setLeaderboard(json.leaderboard || []);
      }
    } catch {}
  };

  const fetchAuditLogs = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch("/internal/audit-logs", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogsList(json.logs || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (adminToken) {
      fetchHealth();
      fetchKeys();
      fetchTokens();
      fetchModels();
      fetchLeaderboard();
      fetchTimeseries();
      fetchAuditLogs();
      if (activeTab === "logs") fetchLogs();
      if (activeTab === "routing") fetchCanary();
    }
    
    let eventSource: EventSource | null = null;
    if (adminToken && activeTab === "overview") {
      eventSource = new EventSource(`/internal/stream?token=${encodeURIComponent(adminToken)}`);
      eventSource.addEventListener("metrics", (e: MessageEvent<string>) => {
        try {
          setTelemetry(JSON.parse(e.data));
        } catch {}
      });
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [adminToken, filterNeedsReview, activeTab, logStatusCode, canaryGroup]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) {
      setKeyMsg("Masukkan Admin Auth Token terlebih dahulu.");
      return;
    }
    setKeyLoading(true);
    setKeyMsg("");
    try {
      const res = await fetch("/internal/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          providerId: newKeyProvider,
          label: newKeyLabel,
          rawKey: newKeyRaw,
          quotaScopeHint: newKeyHint || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setKeyMsg("API Key berhasil ditambahkan!");
        setNewKeyLabel("");
        setNewKeyRaw("");
        setNewKeyHint("");
        fetchKeys();
        fetchHealth();
      } else {
        setKeyMsg(json.error || "Gagal menambah key.");
      }
    } catch {
      setKeyMsg("Terjadi kesalahan jaringan.");
    } finally {
      setKeyLoading(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!adminToken || !confirm("Yakin ingin menghapus key ini?")) return;
    try {
      const res = await fetch(`/internal/keys?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        fetchKeys();
        fetchHealth();
      }
    } catch {}
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setTokenLoading(true);
    try {
      const allowedModels = newTokenAllowedModels.trim()
        ? newTokenAllowedModels.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      const maxDailyRequests = newTokenMaxDaily ? parseInt(newTokenMaxDaily, 10) : null;

      const res = await fetch("/internal/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          projectLabel: newTokenLabel,
          storeBody: newTokenStoreBody,
          allowedModels,
          maxDailyRequests,
        }),
      });
      const json = await res.json();
      if (res.ok && json.rawToken) {
        setGeneratedRawToken(json.rawToken);
        setNewTokenLabel("");
        setNewTokenAllowedModels("");
        setNewTokenMaxDaily("");
        fetchTokens();
      }
    } catch {} finally {
      setTokenLoading(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!adminToken || !confirm("Yakin ingin meretrak/merevoke token gateway ini?")) return;
    try {
      const res = await fetch(`/internal/tokens?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        fetchTokens();
      }
    } catch {}
  };

  const handleToggleModelReview = async (id: string, currentNeedsReview: boolean) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/internal/models", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id,
          needsReview: !currentNeedsReview,
        }),
      });
      if (res.ok) {
        fetchModels();
      }
    } catch {}
  };

  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPgLoading(true);
    setPgResponse("");
    setPgLatency(null);
    const startTime = Date.now();

    try {
      const messages = [];
      if (pgSystem) messages.push({ role: "system", content: pgSystem });
      messages.push({ role: "user", content: pgUserPrompt });

      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          model: pgModel,
          messages,
          temperature: 0.7,
        }),
      });

      const json = await res.json();
      setPgLatency(Date.now() - startTime);

      if (res.ok) {
        const text = json.choices?.[0]?.message?.content || JSON.stringify(json, null, 2);
        setPgResponse(text);
      } else {
        setPgResponse(`Error ${res.status}: ${json.error?.message || "Gagal mendapatkan respon"}`);
      }
    } catch (err) {
      setPgResponse(`Network Error: ${(err as Error).message}`);
    } finally {
      setPgLoading(false);
    }
  };

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscLoading(true);
    setDiscResult(null);
    setDiscError("");
    try {
      const res = await fetch("/api/internal/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: discBaseUrl,
          apiKey: discApiKey,
          label: discLabel,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDiscResult(json);
        fetchKeys();
        fetchModels();
        fetchHealth();
      } else {
        setDiscError(json.error?.message || "Gagal melakukan discovery model");
      }
    } catch (err) {
      setDiscError(`Network Error: ${(err as Error).message}`);
    } finally {
      setDiscLoading(false);
    }
  };

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1400, margin: "0 auto" }}>
      {/* HEADER BAR */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              color: "#0f172a",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
            }}
          >
            AI
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Free AI Gateway</h1>
              <span className="status-badge status-active">
                <span className="pulse-dot"></span> v1.3 Production Ready
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Unified OpenAI-compatible Gateway & Multi-Key Load Balancer
            </p>
          </div>
        </div>

        {/* Admin Token Bar & Config Backup */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="glass-panel" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500 }}>ADMIN AUTH:</span>
            <input
              type="password"
              placeholder="INTERNAL_ADMIN_TOKEN"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="glass-input"
              style={{ width: 200, padding: "6px 10px", fontSize: 13 }}
            />
            {adminToken ? (
              <span style={{ fontSize: 12, color: "var(--accent-emerald)", fontWeight: 600 }}>[Authenticated]</span>
            ) : (
              <span style={{ fontSize: 12, color: "var(--accent-amber)" }}>[Read-Only Mode]</span>
            )}
          </div>

          {adminToken && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleExportConfig} className="btn-secondary" style={{ fontSize: 12, padding: "8px 12px" }}>
                📥 Export Config JSON
              </button>
              <label className="btn-secondary" style={{ fontSize: 12, padding: "8px 12px", cursor: "pointer", display: "inline-block" }}>
                📤 Import Config
                <input type="file" accept=".json" onChange={handleImportConfig} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 28,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 12,
          overflowX: "auto",
          alignItems: "center",
        }}
      >
        {[
          { id: "overview", label: "Overview Metrics", isAdvanced: false },
          { id: "keys", label: `API Key Pool (${keys.length})`, isAdvanced: false },
          { id: "tokens", label: `Gateway Tokens (${tokens.length})`, isAdvanced: false },
          { id: "playground", label: "Live Playground", isAdvanced: false },
          { id: "models", label: `Katalog Model (${catalogModels.length})`, isAdvanced: true },
          { id: "routing", label: "Smart Routing & Groups", isAdvanced: true },
          { id: "discovery", label: "Connect Local / Custom LLM", isAdvanced: true },
          { id: "logs", label: `Request Logs (${logs.length})`, isAdvanced: true },
        ]
          .filter((tab) => !tab.isAdvanced || showAdvancedTabs)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as "overview" | "keys" | "tokens" | "models" | "routing" | "discovery" | "playground" | "logs"
                )
              }
              className={activeTab === tab.id ? "btn-primary" : "btn-secondary"}
              style={{ borderRadius: 10, padding: "8px 16px" }}
            >
              {tab.label}
            </button>
          ))}

        <button
          onClick={() => setShowAdvancedTabs(!showAdvancedTabs)}
          className="btn-secondary"
          style={{
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            marginLeft: "auto",
            borderColor: showAdvancedTabs ? "var(--accent-cyan)" : "rgba(255,255,255,0.15)",
            color: showAdvancedTabs ? "var(--accent-cyan)" : "var(--text-muted)",
          }}
        >
          {showAdvancedTabs ? "⚙️ Sembunyikan Fitur Lanjutan" : "⚙️ Tampilkan Fitur Lanjutan"}
        </button>
      </nav>

      {/* TAB COMPONENTS */}
      {activeTab === "overview" && (
        <OverviewTab
          healthData={healthData}
          telemetry={telemetry}
          keys={keys}
          catalogModels={catalogModels}
          timeseries={timeseries}
          leaderboard={leaderboard}
          auditLogsList={auditLogsList}
          chaosLoading={chaosLoading}
          handleToggleChaos={handleToggleChaos}
        />
      )}

      {activeTab === "keys" && (
        <KeysTab
          keys={keys}
          newKeyProvider={newKeyProvider}
          setNewKeyProvider={setNewKeyProvider}
          newKeyLabel={newKeyLabel}
          setNewKeyLabel={setNewKeyLabel}
          newKeyRaw={newKeyRaw}
          setNewKeyRaw={setNewKeyRaw}
          newKeyHint={newKeyHint}
          setNewKeyHint={setNewKeyHint}
          keyLoading={keyLoading}
          keyMsg={keyMsg}
          handleAddKey={handleAddKey}
          handleDeleteKey={handleDeleteKey}
          fetchKeys={fetchKeys}
        />
      )}

      {activeTab === "tokens" && (
        <TokensTab
          tokens={tokens}
          newTokenLabel={newTokenLabel}
          setNewTokenLabel={setNewTokenLabel}
          newTokenStoreBody={newTokenStoreBody}
          setNewTokenStoreBody={setNewTokenStoreBody}
          newTokenAllowedModels={newTokenAllowedModels}
          setNewTokenAllowedModels={setNewTokenAllowedModels}
          newTokenMaxDaily={newTokenMaxDaily}
          setNewTokenMaxDaily={setNewTokenMaxDaily}
          generatedRawToken={generatedRawToken}
          tokenLoading={tokenLoading}
          selectedConfigTool={selectedConfigTool}
          setSelectedConfigTool={setSelectedConfigTool}
          handleCreateToken={handleCreateToken}
          handleRevokeToken={handleRevokeToken}
        />
      )}

      {activeTab === "models" && (
        <ModelsTab
          catalogModels={catalogModels}
          filterNeedsReview={filterNeedsReview}
          setFilterNeedsReview={setFilterNeedsReview}
          fetchModels={fetchModels}
          handleToggleModelReview={handleToggleModelReview}
        />
      )}

      {activeTab === "routing" && (
        <RoutingTab
          testPrompt={testPrompt}
          setTestPrompt={setTestPrompt}
          detectedTask={detectedTask}
          canaryGroup={canaryGroup}
          setCanaryGroup={setCanaryGroup}
          canaryMainModel={canaryMainModel}
          setCanaryMainModel={setCanaryMainModel}
          canaryCandidateModel={canaryCandidateModel}
          setCanaryCandidateModel={setCanaryCandidateModel}
          canaryWeight={canaryWeight}
          setCanaryWeight={setCanaryWeight}
          canaryActiveRule={canaryActiveRule}
          canaryMsg={canaryMsg}
          handleSaveCanary={handleSaveCanary}
          handleRemoveCanary={handleRemoveCanary}
        />
      )}

      {activeTab === "discovery" && (
        <DiscoveryTab
          discBaseUrl={discBaseUrl}
          setDiscBaseUrl={setDiscBaseUrl}
          discLabel={discLabel}
          setDiscLabel={setDiscLabel}
          discApiKey={discApiKey}
          setDiscApiKey={setDiscApiKey}
          discLoading={discLoading}
          discResult={discResult}
          discError={discError}
          handleRunDiscovery={handleRunDiscovery}
        />
      )}

      {activeTab === "playground" && (
        <PlaygroundTab
          pgModel={pgModel}
          setPgModel={setPgModel}
          pgSystem={pgSystem}
          setPgSystem={setPgSystem}
          pgUserPrompt={pgUserPrompt}
          setPgUserPrompt={setPgUserPrompt}
          pgLoading={pgLoading}
          pgResponse={pgResponse}
          pgLatency={pgLatency}
          handlePlaygroundSubmit={handlePlaygroundSubmit}
        />
      )}

      {activeTab === "logs" && (
        <LogsTab
          logs={logs}
          logStatusCode={logStatusCode}
          setLogStatusCode={setLogStatusCode}
          logLoading={logLoading}
          fetchLogs={fetchLogs}
          selectedLogBody={selectedLogBody}
          setSelectedLogBody={setSelectedLogBody}
        />
      )}
    </div>
  );
}
