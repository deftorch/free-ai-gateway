"use client";

import React from "react";
import { LogEntry } from "../types";

interface LogsTabProps {
  logs: LogEntry[];
  logStatusCode: string;
  setLogStatusCode: (val: string) => void;
  logLoading: boolean;
  fetchLogs: () => void;
  selectedLogBody: LogEntry | null;
  setSelectedLogBody: (log: LogEntry | null) => void;
}

export default function LogsTab({
  logs,
  logStatusCode,
  setLogStatusCode,
  logLoading,
  fetchLogs,
  selectedLogBody,
  setSelectedLogBody,
}: LogsTabProps) {
  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Interactive Log Explorer & Payload Inspector</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Riwayat aktivitas request gateway, status code, latensi, dan inspeksi prompt/response payload.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={logStatusCode}
            onChange={(e) => setLogStatusCode(e.target.value)}
            className="glass-input"
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            <option value="">Semua Status Code</option>
            <option value="200">200 OK (Success)</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="403">403 Forbidden Scope</option>
            <option value="429">429 Rate Limit / Quota</option>
            <option value="500">500 Server Error</option>
          </select>

          <button onClick={fetchLogs} disabled={logLoading} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>
            {logLoading ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          {logLoading ? "Memuat data request logs..." : "Belum ada riwayat request log terdeteksi (atau Admin Token belum diisi)."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                <th style={{ padding: 10 }}>Waktu (UTC)</th>
                <th style={{ padding: 10 }}>Proyek Token</th>
                <th style={{ padding: 10 }}>Model Requested</th>
                <th style={{ padding: 10 }}>Model Executed</th>
                <th style={{ padding: 10 }}>Status Code</th>
                <th style={{ padding: 10 }}>Latensi</th>
                <th style={{ padding: 10 }}>Tokens (In/Out)</th>
                <th style={{ padding: 10 }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusColor =
                  log.statusCode === 200
                    ? "var(--accent-emerald)"
                    : log.statusCode === 429
                    ? "var(--accent-amber)"
                    : "var(--accent-rose)";

                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 10, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: 10, fontWeight: 600, fontSize: 13 }}>
                      {log.projectLabel || "Unknown Token"}
                    </td>
                    <td style={{ padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--primary)" }}>
                      {log.modelRequested}
                    </td>
                    <td style={{ padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-purple)" }}>
                      {log.modelUsed || "-"}
                    </td>
                    <td style={{ padding: 10 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          background: `${statusColor}22`,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                        }}
                      >
                        {log.statusCode || 500}
                      </span>
                    </td>
                    <td style={{ padding: 10, fontFamily: "var(--font-mono)", fontSize: 13 }}>
                      {log.latencyMs ? `${log.latencyMs} ms` : "-"}
                    </td>
                    <td style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>
                      {log.tokensIn || 0} / {log.tokensOut || 0}
                    </td>
                    <td style={{ padding: 10 }}>
                      {log.body ? (
                        <button
                          onClick={() => setSelectedLogBody(log)}
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          Inspect Payload
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No Body</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYLOAD INSPECTOR MODAL */}
      {selectedLogBody && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedLogBody(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: 800,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
              background: "#0f172a",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>Payload Inspector</h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Log ID: {selectedLogBody.id} ({selectedLogBody.modelRequested})
                </span>
              </div>
              <button onClick={() => setSelectedLogBody(null)} className="btn-secondary" style={{ padding: "4px 12px" }}>
                Close ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>PROMPT / REQUEST BODY:</div>
                <pre
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                    color: "#a5f3fc",
                    maxHeight: 250,
                  }}
                >
                  {JSON.stringify(selectedLogBody.body?.prompt, null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>LLM RESPONSE BODY:</div>
                <pre
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                    color: "#6ee7b7",
                    maxHeight: 250,
                  }}
                >
                  {JSON.stringify(selectedLogBody.body?.response, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
