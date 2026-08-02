"use client";

import React from "react";
import { DiscoveryResult } from "../types";

interface DiscoveryTabProps {
  discBaseUrl: string;
  setDiscBaseUrl: (val: string) => void;
  discLabel: string;
  setDiscLabel: (val: string) => void;
  discApiKey: string;
  setDiscApiKey: (val: string) => void;
  discLoading: boolean;
  discResult: DiscoveryResult | null;
  discError: string;
  handleRunDiscovery: (e: React.FormEvent) => void;
}

export default function DiscoveryTab({
  discBaseUrl,
  setDiscBaseUrl,
  discLabel,
  setDiscLabel,
  discApiKey,
  setDiscApiKey,
  discLoading,
  discResult,
  discError,
  handleRunDiscovery,
}: DiscoveryTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* DISCOVERY FORM */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Auto-Discover Local / Custom LLM Server</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          Hubungkan server LLM lokal (Ollama, LM Studio, vLLM, LocalAI) atau reverse proxy custom. Gateway akan menembak <code>GET /v1/models</code> dan otomatis mendaftarkan model ke database.
        </p>

        <form onSubmit={handleRunDiscovery} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Server Base URL (OpenAI-Compatible /v1)
            </label>
            <input
              type="text"
              placeholder="http://localhost:11434/v1"
              value={discBaseUrl}
              onChange={(e) => setDiscBaseUrl(e.target.value)}
              className="glass-input"
              style={{ width: "100%", fontFamily: "var(--font-mono)" }}
              required
            />
            <span style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, display: "block" }}>
              Contoh Ollama: <code>http://localhost:11434/v1</code> | LM Studio: <code>http://localhost:1234/v1</code>
            </span>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Display Label / Name
            </label>
            <input
              type="text"
              placeholder="Ollama Local Node"
              value={discLabel}
              onChange={(e) => setDiscLabel(e.target.value)}
              className="glass-input"
              style={{ width: "100%" }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              API Key (Opsional)
            </label>
            <input
              type="password"
              placeholder="sk-custom-secret (optional)"
              value={discApiKey}
              onChange={(e) => setDiscApiKey(e.target.value)}
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <button type="submit" disabled={discLoading} className="btn-primary" style={{ alignSelf: "flex-start", marginTop: 8 }}>
            {discLoading ? "Discovering Models..." : "Ping & Register Discovered Models"}
          </button>
        </form>

        {discError && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: 13 }}>
            [Error]: {discError}
          </div>
        )}
      </div>

      {/* DISCOVERY RESULT */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Status Model Terdeteksi</h2>

        {discResult ? (
          <div>
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#6ee7b7", fontSize: 13, marginBottom: 16 }}>
              Berhasil menemukan <strong>{discResult.discoveredCount} model</strong> dari <code>{discResult.provider?.baseUrl}</code>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>DAFTAR MODEL TERDAFTAR:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
              {((discResult.models as Array<{ id: string }>) || []).map((m: { id: string }) => (
                <div key={m.id} style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-mono)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--primary)" }}>{m.id}</span>
                  <span className="status-badge status-active">active</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>
            Masukkan URL server LLM lokal Anda di formulir sebelah kiri dan klik <strong>&quot;Ping &amp; Register Discovered Models&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
