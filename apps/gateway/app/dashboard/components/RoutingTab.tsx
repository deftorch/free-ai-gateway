"use client";

import React from "react";
import { CanaryRule } from "../types";

interface RoutingTabProps {
  testPrompt: string;
  setTestPrompt: (val: string) => void;
  detectedTask: "coding" | "vision" | "general";
  canaryGroup: string;
  setCanaryGroup: (val: string) => void;
  canaryMainModel: string;
  setCanaryMainModel: (val: string) => void;
  canaryCandidateModel: string;
  setCanaryCandidateModel: (val: string) => void;
  canaryWeight: number;
  setCanaryWeight: (val: number) => void;
  canaryActiveRule: CanaryRule | null;
  canaryMsg: string;
  handleSaveCanary: (e: React.FormEvent) => void;
  handleRemoveCanary: () => void;
}

export default function RoutingTab({
  testPrompt,
  setTestPrompt,
  detectedTask,
  canaryGroup,
  setCanaryGroup,
  canaryMainModel,
  setCanaryMainModel,
  canaryCandidateModel,
  setCanaryCandidateModel,
  canaryWeight,
  setCanaryWeight,
  canaryActiveRule,
  canaryMsg,
  handleSaveCanary,
  handleRemoveCanary,
}: RoutingTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Interactive Task Classifier Tester */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Interactive Task Classifier (Smart Router)</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Uji bagaimana router mengklasifikasikan prompt dan memilih model kandidat otomatis untuk alias <code>auto</code>.
        </p>

        <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Contoh Request Prompt</label>
        <textarea
          rows={4}
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          className="glass-input"
          style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13, resize: "vertical" }}
        />

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>DETECTED TASK CATEGORY:</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>
            [{detectedTask.toUpperCase()}]
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14, marginBottom: 4 }}>RESOLVED MODEL CANDIDATES:</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent-emerald)" }}>
            {detectedTask === "coding" && "1. groq/openai/gpt-oss-120b\n2. openrouter/qwen/qwen3-coder:free"}
            {detectedTask === "vision" && "1. google-ai-studio/gemini-2.0-flash-exp\n2. openrouter/google/gemini-flash-1.5:free"}
            {detectedTask === "general" && "1. groq/openai/gpt-oss-120b\n2. google-ai-studio/gemini-2.0-flash-exp"}
          </div>
        </div>
      </div>

      {/* Model Groups Registry */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Daftar Model Groups Virtual</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { id: "auto", strategy: "task-classified", members: "Dynamic (coding/vision/general)" },
            { id: "kode-terbaik", strategy: "ordered fallback", members: "groq/llama-3.3-70b, openrouter/qwen3-coder" },
            { id: "fastest-first", strategy: "latency-based", members: "groq/llama-3.3-70b, google/gemini-2.0-flash" },
            { id: "best-coding", strategy: "priority ordered", members: "groq/openai/gpt-oss-120b" },
          ].map((g) => (
            <div
              key={g.id}
              style={{
                padding: 14,
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{g.id}</span>
                <span className="status-badge status-active">{g.strategy}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Members: {g.members}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Canary Traffic Splitting Control Panel */}
      <div className="glass-panel" style={{ padding: 24, gridColumn: "1 / -1", marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>A/B & Canary Testing Traffic Splitting</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Alokasikan sebagian % traffic secara otomatis ke model kandidat baru untuk menguji performanya di produksi secara aman.
            </p>
          </div>
          {canaryActiveRule && (
            <span className="status-badge status-active">⚡ Canary Active: {canaryActiveRule.canaryWeight}% Traffic</span>
          )}
        </div>

        <form onSubmit={handleSaveCanary} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Target Model Group / Alias</label>
            <input
              type="text"
              value={canaryGroup}
              onChange={(e) => setCanaryGroup(e.target.value)}
              className="glass-input"
              style={{ width: "100%", fontSize: 13 }}
              placeholder="kode-terbaik"
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Model Utama (Stable)</label>
            <input
              type="text"
              value={canaryMainModel}
              onChange={(e) => setCanaryMainModel(e.target.value)}
              className="glass-input"
              style={{ width: "100%", fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Model Kandidat Baru (Canary)</label>
            <input
              type="text"
              value={canaryCandidateModel}
              onChange={(e) => setCanaryCandidateModel(e.target.value)}
              className="glass-input"
              style={{ width: "100%", fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Traffic Canary (%)</label>
            <input
              type="number"
              min={1}
              max={99}
              value={canaryWeight}
              onChange={(e) => setCanaryWeight(Number(e.target.value))}
              className="glass-input"
              style={{ width: 90, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
              Aktifkan Canary
            </button>
            {canaryActiveRule && (
              <button type="button" onClick={handleRemoveCanary} className="btn-danger" style={{ padding: "8px 14px", fontSize: 13 }}>
                Hapus
              </button>
            )}
          </div>
        </form>

        {canaryMsg && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--accent-emerald)" }}>{canaryMsg}</div>
        )}

        {canaryActiveRule && (
          <div style={{ marginTop: 16, padding: 14, background: "rgba(0,0,0,0.4)", borderRadius: 10, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>STATUS ALOKASI TRAFFIC SAAT INI:</div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div>🟢 Model Utama ({(100 - canaryActiveRule.canaryWeight)}% Traffic): <strong>{canaryActiveRule.mainModel}</strong></div>
              <div>🟡 Model Canary ({canaryActiveRule.canaryWeight}% Traffic): <strong>{canaryActiveRule.canaryModel}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
