"use client";

import React from "react";
import { HealthMetrics, ApiKeyRow, ModelRow, TelemetrySnapshot, TimeseriesPoint, LeaderboardEntry, AuditLogEntry } from "../types";

interface OverviewTabProps {
  healthData: HealthMetrics | null;
  telemetry?: TelemetrySnapshot | null;
  keys: ApiKeyRow[];
  catalogModels: ModelRow[];
  timeseries: TimeseriesPoint[];
  leaderboard: LeaderboardEntry[];
  auditLogsList: AuditLogEntry[];
  chaosLoading: string | null;
  handleToggleChaos: (providerId: string, currentChaos?: boolean) => void;
}

export default function OverviewTab({
  healthData,
  telemetry,
  keys,
  catalogModels,
  timeseries,
  leaderboard,
  auditLogsList,
  chaosLoading,
  handleToggleChaos,
}: OverviewTabProps) {
  return (
    <div>
      {/* TOP METRIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Provider Keys</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)" }}>
            {healthData ? `${healthData.activeKeysCount} Active / ${healthData.totalKeysCount}` : `${keys.length} Keys`}
          </div>
          <div style={{ fontSize: 12, color: "var(--accent-emerald)", marginTop: 6 }}>15 Provider Adapters Ready</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Registered Models</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent-purple)" }}>
            {catalogModels.length || 24} Models
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>OpenAI, Anthropic & Local Native</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            Gateway Status
            {telemetry && <span className="status-badge status-active"><span className="pulse-dot"></span> Live</span>}
          </div>
          
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: telemetry?.status === "healthy" ? "var(--accent-emerald)" : "var(--primary)" }}>
                {telemetry ? `${telemetry.rps} RPS` : "Operational"}
              </div>
              <div style={{ fontSize: 12, color: "var(--accent-emerald)", marginTop: 6 }}>
                {telemetry ? `Latency: ${telemetry.latency}ms` : "Auto-failover Active"}
              </div>
            </div>
            
            {telemetry && (
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>CPU Load</div>
                <div style={{ fontWeight: 600, color: (telemetry.cpuUsage ?? 0) > 80 ? "#ef4444" : "var(--accent-cyan)" }}>
                  {telemetry.cpuUsage ?? 0}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Key Ordering Strategy</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-amber)" }}>LRU & Round-Robin</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Tracked via Upstash Redis KV</div>
        </div>
      </div>

      {/* AGGREGATED PROVIDER CAPACITY GRID */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Kapasitas Kuota Gabungan (Aggregated Capacity Bar)</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Total batas harian RPD, pemakaian realtime, dan ketersediaan key per provider (Reset otomatis 00:00 UTC)
            </p>
          </div>
          <span className="status-badge status-active">
            <span className="pulse-dot"></span> Live Redis Tracking
          </span>
        </div>

        {!healthData?.providerCapacity || healthData.providerCapacity.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Belum ada API key terdaftar yang aktif. Tambahkan key di tab API Key Pool untuk melihat kapasitas.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {healthData.providerCapacity.map((cap) => {
              const barColor =
                cap.rpdUsagePercent >= 85
                  ? "#ef4444"
                  : cap.rpdUsagePercent >= 60
                  ? "#f59e0b"
                  : "#06b6d4";

              return (
                <div
                  key={cap.providerId}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                        {cap.providerId}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                        ({cap.readyKeys}/{cap.totalKeys} Ready Keys)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        background:
                          cap.healthStatus === "critical"
                            ? "rgba(239, 68, 68, 0.2)"
                            : cap.healthStatus === "degraded"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        color:
                          cap.healthStatus === "critical"
                            ? "#f87171"
                            : cap.healthStatus === "degraded"
                            ? "#fbbf24"
                            : "#34d399",
                      }}
                    >
                      {cap.healthStatus}
                    </span>
                  </div>

                  {/* CAPACITY PROGRESS BAR */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "var(--text-muted)" }}>
                        RPD Used: {cap.totalRpdUsed.toLocaleString()} / {cap.totalRpdLimit.toLocaleString()}
                      </span>
                      <span style={{ fontWeight: 600, color: barColor }}>{cap.rpdUsagePercent}%</span>
                    </div>
                    <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, cap.rpdUsagePercent))}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* STATUS BREAKDOWN */}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-dim)", flexWrap: "wrap" }}>
                    <span>Sisa: <strong style={{ color: "var(--text-main)" }}>{cap.totalRpdRemaining.toLocaleString()}</strong></span>
                    {cap.cooldownKeys > 0 && <span style={{ color: "#fbbf24" }}>Cooldown: {cap.cooldownKeys}</span>}
                    {cap.exhaustedKeys > 0 && <span style={{ color: "#f87171" }}>Quota Full: {cap.exhaustedKeys}</span>}
                    {cap.disabledKeys > 0 && <span style={{ color: "#94a3b8" }}>Disabled: {cap.disabledKeys}</span>}
                  </div>

                  {/* CHAOS SIMULATOR BUTTON */}
                  <button
                    onClick={() => handleToggleChaos(cap.providerId, cap.isChaosOutage)}
                    disabled={chaosLoading === cap.providerId}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: "pointer",
                      border: cap.isChaosOutage ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.12)",
                      background: cap.isChaosOutage ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.04)",
                      color: cap.isChaosOutage ? "#f87171" : "var(--text-muted)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {chaosLoading === cap.providerId
                      ? "Updating..."
                      : cap.isChaosOutage
                      ? "⚡ Outage Active (Klik untuk Pulihkan)"
                      : "🔥 Chaos: Simulate Outage"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROVIDER HEALTH & STATS TABLE */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Status Health Provider Realtime</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                <th style={{ padding: 12 }}>Provider ID</th>
                <th style={{ padding: 12 }}>Adapter Name</th>
                <th style={{ padding: 12 }}>Total Keys</th>
                <th style={{ padding: 12 }}>Active Keys</th>
                <th style={{ padding: 12 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                "groq",
                "openrouter",
                "google-ai-studio",
                "cerebras",
                "cloudflare",
                "sambanova",
                "mistral",
                "nvidia",
                "cohere",
                "together",
                "huggingface",
                "kilo",
                "fireworks",
                "novita",
                "hyperbolic",
              ].map((providerId) => {
                const stats = healthData?.providerStats?.[providerId];
                return (
                  <tr key={providerId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                      {providerId}
                    </td>
                    <td style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>{providerId.toUpperCase()} Native Adapter</td>
                    <td style={{ padding: 12 }}>{stats?.totalKeys ?? 0} keys</td>
                    <td style={{ padding: 12, color: "var(--accent-emerald)", fontWeight: 600 }}>{stats?.activeKeys ?? 0} active</td>
                    <td style={{ padding: 12 }}>
                      <span className="status-badge status-active">
                        <span className="pulse-dot"></span> Operational
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. 24H TIME-SERIES LATENCY & ERROR RATE CHART */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Tren Latensi & Error Rate 24 Jam Terakhir</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          Visualisasi time-series fluktuasi rata-rata latensi (ms) dan error rate per 1 jam
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {timeseries.length === 0 ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Belum ada data metrik (menunggu aktivitas atau ClickHouse belum terhubung).
            </div>
          ) : (
            timeseries.map((pt, i) => {
              const heightPct = Math.min(100, Math.max(15, (pt.avgLatencyMs / 500) * 100));
              const barColor = pt.errorCount > 0 ? "#f87171" : "var(--primary)";
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{pt.avgLatencyMs}ms</div>
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background: barColor,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.4s ease",
                    }}
                    title={`${pt.time}: Latency ${pt.avgLatencyMs}ms (${pt.totalRequests} req, ${pt.errorCount} error)`}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{pt.time}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MODEL LEADERBOARD RANKING CARD */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>🏆 Leaderboard Model Gratis Tercepat & Terandal</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Ranking model otomatis berdasarkan gabungan skor uptime % dan latensi respons
            </p>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          {leaderboard.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Belum ada data metrik model.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: 10 }}>Rank</th>
                  <th style={{ padding: 10 }}>Model ID</th>
                  <th style={{ padding: 10 }}>Provider</th>
                  <th style={{ padding: 10 }}>Avg Latency</th>
                  <th style={{ padding: 10 }}>Success Rate</th>
                  <th style={{ padding: 10 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((m, idx) => (
                  <tr key={m.modelId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 10, fontWeight: 700, color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "var(--text-muted)" }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>{m.modelId}</td>
                    <td style={{ padding: 10 }}>{m.providerId}</td>
                    <td style={{ padding: 10, color: "var(--accent-emerald)" }}>{m.avgLatencyMs !== null ? `${m.avgLatencyMs} ms` : "-"}</td>
                    <td style={{ padding: 10 }}>{m.successRate !== null ? `${m.successRate}%` : "-"}</td>
                    <td style={{ padding: 10 }}>
                      <span className="status-badge status-active">{m.score !== null ? `${m.score} / 100` : "N/A"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3. ADMIN AUDIT TRAIL LOG CARD */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📋 Audit Trail Log Admin</h2>
        {auditLogsList.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Belum ada aktivitas admin tercatat.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {auditLogsList.slice(0, 5).map((log) => (
              <div key={log.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, color: "var(--accent-cyan)", marginRight: 8 }}>[{log.action}]</span>
                  <span style={{ color: "var(--text-dim)" }}>Target: {log.targetId || "System"}</span>
                </div>
                <div style={{ color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
