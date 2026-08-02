"use client";

import React, { useState } from "react";
import { GatewayTokenRow } from "../types";
import ConfigGeneratorWidget from "./ConfigGeneratorWidget";

interface TokensTabProps {
  tokens: GatewayTokenRow[];
  newTokenLabel: string;
  setNewTokenLabel: (val: string) => void;
  newTokenStoreBody: boolean;
  setNewTokenStoreBody: (val: boolean) => void;
  newTokenAllowedModels: string;
  setNewTokenAllowedModels: (val: string) => void;
  newTokenMaxDaily: string;
  setNewTokenMaxDaily: (val: string) => void;
  generatedRawToken: string | null;
  tokenLoading: boolean;
  selectedConfigTool: string;
  setSelectedConfigTool: (val: string) => void;
  handleCreateToken: (e: React.FormEvent) => void;
  handleRevokeToken: (id: string) => void;
}

export default function TokensTab({
  tokens,
  newTokenLabel,
  setNewTokenLabel,
  newTokenStoreBody,
  setNewTokenStoreBody,
  newTokenAllowedModels,
  setNewTokenAllowedModels,
  newTokenMaxDaily,
  setNewTokenMaxDaily,
  generatedRawToken,
  tokenLoading,
  selectedConfigTool,
  setSelectedConfigTool,
  handleCreateToken,
  handleRevokeToken,
}: TokensTabProps) {
  const [rawTokenCopied, setRawTokenCopied] = useState(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Buat Gateway Token Proyek Baru</h2>
        <form onSubmit={handleCreateToken} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Project Label</label>
            <input
              type="text"
              placeholder="Misal: Cursor IDE / Claude CLI Project"
              value={newTokenLabel}
              onChange={(e) => setNewTokenLabel(e.target.value)}
              required
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Allowed Model Scopes (Opsional, pisahkan koma)
            </label>
            <input
              type="text"
              placeholder="Misal: groq/*, google-ai-studio/* (kosongkan = Semua Model)"
              value={newTokenAllowedModels}
              onChange={(e) => setNewTokenAllowedModels(e.target.value)}
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Max Daily Request Cap (Opsional, angka/hari)
            </label>
            <input
              type="number"
              placeholder="Misal: 500 (kosongkan = Unlimited)"
              value={newTokenMaxDaily}
              onChange={(e) => setNewTokenMaxDaily(e.target.value)}
              min="1"
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="storeBody"
              checked={newTokenStoreBody}
              onChange={(e) => setNewTokenStoreBody(e.target.checked)}
            />
            <label htmlFor="storeBody" style={{ fontSize: 13, color: "var(--text-main)" }}>
              Catat prompt/response di request_bodies
            </label>
          </div>

          <button type="submit" disabled={tokenLoading} className="btn-primary" style={{ marginTop: 8 }}>
            {tokenLoading ? "Generating..." : "Generate Gateway Token"}
          </button>
        </form>

        {generatedRawToken && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                RAW GATEWAY TOKEN (SIMPAN SEKARANG):
              </span>
              <button
                onClick={() => {
                  if (generatedRawToken) {
                    navigator.clipboard.writeText(generatedRawToken);
                    setRawTokenCopied(true);
                    setTimeout(() => setRawTokenCopied(false), 2000);
                  }
                }}
                className="glass-button"
                style={{
                  fontSize: 11,
                  padding: "2px 10px",
                  background: rawTokenCopied ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.1)",
                  color: rawTokenCopied ? "#86efac" : "var(--text-main)",
                  border: rawTokenCopied ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {rawTokenCopied ? "✓ Copied!" : "📋 Copy Token"}
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                wordBreak: "break-all",
                background: "rgba(0,0,0,0.4)",
                padding: 10,
                borderRadius: 6,
                color: "var(--accent-emerald)",
              }}
            >
              {generatedRawToken}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, marginBottom: 14 }}>
              Token ini hanya ditampilkan sekali. Gunakan sebagai Authorization: Bearer token di client OpenAI/Anthropic SDK.
            </div>

            {/* Quick Configuration Snippet Generator Widget */}
            <ConfigGeneratorWidget
              generatedRawToken={generatedRawToken}
              selectedConfigTool={selectedConfigTool}
              setSelectedConfigTool={setSelectedConfigTool}
            />
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Daftar Gateway Tokens Proyek</h2>
        {tokens.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
            Belum ada Gateway Token yang terdaftar.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: 10 }}>Project Label</th>
                  <th style={{ padding: 10 }}>Allowed Models Scope</th>
                  <th style={{ padding: 10 }}>Daily Request Cap</th>
                  <th style={{ padding: 10 }}>Token Hash (SHA-256)</th>
                  <th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{t.projectLabel}</td>
                    <td style={{ padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--primary)" }}>
                      {t.allowedModels && t.allowedModels.length > 0 ? t.allowedModels.join(", ") : "All Models"}
                    </td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      {typeof t.maxDailyRequests === "number" && t.maxDailyRequests > 0 ? (
                        <span style={{ color: (t.usedToday ?? 0) >= t.maxDailyRequests ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                          {t.usedToday ?? 0} / {t.maxDailyRequests} RPD
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Unlimited ({t.usedToday ?? 0} RPD)</span>
                      )}
                    </td>
                    <td style={{ padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {t.tokenHash?.slice(0, 16)}...
                    </td>
                    <td style={{ padding: 10 }}>
                      <span className="status-badge status-active">Active</span>
                    </td>
                    <td style={{ padding: 10 }}>
                      <button onClick={() => handleRevokeToken(t.id)} className="btn-danger">
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
