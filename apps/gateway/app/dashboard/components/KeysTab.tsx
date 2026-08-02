"use client";

import React from "react";
import { ApiKeyRow } from "../types";

interface KeysTabProps {
  keys: ApiKeyRow[];
  newKeyProvider: string;
  setNewKeyProvider: (val: string) => void;
  newKeyLabel: string;
  setNewKeyLabel: (val: string) => void;
  newKeyRaw: string;
  setNewKeyRaw: (val: string) => void;
  newKeyHint: string;
  setNewKeyHint: (val: string) => void;
  keyLoading: boolean;
  keyMsg: string;
  handleAddKey: (e: React.FormEvent) => void;
  handleDeleteKey: (id: string) => void;
  fetchKeys: () => void;
}

export default function KeysTab({
  keys,
  newKeyProvider,
  setNewKeyProvider,
  newKeyLabel,
  setNewKeyLabel,
  newKeyRaw,
  setNewKeyRaw,
  newKeyHint,
  setNewKeyHint,
  keyLoading,
  keyMsg,
  handleAddKey,
  handleDeleteKey,
  fetchKeys,
}: KeysTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
      {/* Form Tambah Key */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Tambah Provider Key Baru</h2>
        <form onSubmit={handleAddKey} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Provider Target</label>
            <select
              value={newKeyProvider}
              onChange={(e) => setNewKeyProvider(e.target.value)}
              className="glass-input"
              style={{ width: "100%" }}
            >
              <option value="groq">Groq AI (groq)</option>
              <option value="openrouter">OpenRouter (openrouter)</option>
              <option value="google-ai-studio">Google AI Studio (google-ai-studio)</option>
              <option value="cerebras">Cerebras (cerebras)</option>
              <option value="cloudflare">Cloudflare Workers AI (cloudflare)</option>
              <option value="sambanova">SambaNova Cloud (sambanova)</option>
              <option value="mistral">Mistral AI (mistral)</option>
              <option value="nvidia">NVIDIA NIM (nvidia)</option>
              <option value="cohere">Cohere (cohere)</option>
              <option value="together">Together AI (together)</option>
              <option value="huggingface">HuggingFace (huggingface)</option>
              <option value="kilo">Kilo Gateway (kilo)</option>
              <option value="fireworks">Fireworks AI (fireworks)</option>
              <option value="novita">Novita AI (novita)</option>
              <option value="hyperbolic">Hyperbolic AI (hyperbolic)</option>
              <option value="custom">Custom Node (custom)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Label Key</label>
            <input
              type="text"
              placeholder="Misal: Groq Account Main"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              required
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Raw API Key</label>
            <input
              type="password"
              placeholder="gsk_... / AIzaSy... / nvapi-..."
              value={newKeyRaw}
              onChange={(e) => setNewKeyRaw(e.target.value)}
              required
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quota Scope Hint (Opsional)</label>
            <input
              type="text"
              placeholder="GCP Project ID / Account Label"
              value={newKeyHint}
              onChange={(e) => setNewKeyHint(e.target.value)}
              className="glass-input"
              style={{ width: "100%" }}
            />
          </div>

          <button type="submit" disabled={keyLoading} className="btn-primary" style={{ marginTop: 8 }}>
            {keyLoading ? "Menyimpan..." : "Enkripsi & Simpan Key AES-GCM"}
          </button>

          {keyMsg && (
            <div style={{ fontSize: 13, color: keyMsg.includes("berhasil") ? "var(--accent-emerald)" : "var(--accent-rose)", marginTop: 8 }}>
              {keyMsg}
            </div>
          )}
        </form>
      </div>

      {/* Daftar Key Terdaftar */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Daftar API Key Terenkripsi</h2>
          <button onClick={fetchKeys} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
            Refresh List
          </button>
        </div>

        {keys.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
            Belum ada key terdaftar di database (atau Admin Token belum diisi).
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: 10 }}>Label</th>
                  <th style={{ padding: 10 }}>Provider</th>
                  <th style={{ padding: 10 }}>Quota Scope Hint</th>
                  <th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }}>Error Count</th>
                  <th style={{ padding: 10 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{k.label}</td>
                    <td style={{ padding: 10, color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{k.providerId}</td>
                    <td style={{ padding: 10, color: "var(--accent-purple)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {k.quotaScopeHint || "-"}
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span className={`status-badge status-${k.status || "active"}`}>
                          <span className="pulse-dot"></span> {k.status || "active"}
                        </span>
                        {k.needsRotation && (
                          <span style={{ fontSize: 11, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                            ⚠️ Rotasi Disarankan ({k.ageDays || 60}h)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>{k.errorCount || 0}</td>
                    <td style={{ padding: 10 }}>
                      <button onClick={() => handleDeleteKey(k.id)} className="btn-danger">
                        Hapus
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
