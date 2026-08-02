"use client";

import React from "react";

interface PlaygroundTabProps {
  pgModel: string;
  setPgModel: (val: string) => void;
  pgSystem: string;
  setPgSystem: (val: string) => void;
  pgUserPrompt: string;
  setPgUserPrompt: (val: string) => void;
  pgLoading: boolean;
  pgResponse: string;
  pgLatency: number | null;
  handlePlaygroundSubmit: (e: React.FormEvent) => void;
}

export default function PlaygroundTab({
  pgModel,
  setPgModel,
  pgSystem,
  setPgSystem,
  pgUserPrompt,
  setPgUserPrompt,
  pgLoading,
  pgResponse,
  pgLatency,
  handlePlaygroundSubmit,
}: PlaygroundTabProps) {
  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Live AI Gateway Completion Tester</h2>

      <form onSubmit={handlePlaygroundSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Target Model / Group</label>
          <select
            value={pgModel}
            onChange={(e) => setPgModel(e.target.value)}
            className="glass-input"
            style={{ width: "100%", maxWidth: 400 }}
          >
            <option value="auto">auto (Smart Task Classifier)</option>
            <option value="kode-terbaik">kode-terbaik (Model Group)</option>
            <option value="fastest-first">fastest-first (Model Group)</option>
            <option value="groq/openai/gpt-oss-120b">groq/openai/gpt-oss-120b</option>
            <option value="google-ai-studio/gemini-2.5-flash-lite">google-ai-studio/gemini-2.5-flash-lite</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>System Prompt</label>
          <input
            type="text"
            value={pgSystem}
            onChange={(e) => setPgSystem(e.target.value)}
            className="glass-input"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>User Message</label>
          <textarea
            rows={3}
            value={pgUserPrompt}
            onChange={(e) => setPgUserPrompt(e.target.value)}
            className="glass-input"
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        <button type="submit" disabled={pgLoading} className="btn-primary" style={{ alignSelf: "flex-start" }}>
          {pgLoading ? "Generating Response..." : "Send Request"}
        </button>
      </form>

      {/* RESPONSE OUTPUT */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>RESPONSE CONTENT</span>
          {pgLatency !== null && (
            <span style={{ fontSize: 12, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
              Latency: {pgLatency} ms
            </span>
          )}
        </div>
        <div
          style={{
            background: "rgba(10, 15, 26, 0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 16,
            minHeight: 120,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            color: "var(--text-main)",
          }}
        >
          {pgLoading ? "Waiting for gateway stream response..." : pgResponse || "Klik 'Send Request' untuk menguji endpoint gateway."}
        </div>
      </div>
    </div>
  );
}
