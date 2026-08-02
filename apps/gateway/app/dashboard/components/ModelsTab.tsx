"use client";

import React from "react";
import { ModelRow } from "../types";

interface ModelsTabProps {
  catalogModels: ModelRow[];
  filterNeedsReview: boolean;
  setFilterNeedsReview: (val: boolean) => void;
  fetchModels: () => void;
  handleToggleModelReview: (id: string, currentNeedsReview: boolean) => void;
}

export default function ModelsTab({
  catalogModels,
  filterNeedsReview,
  setFilterNeedsReview,
  fetchModels,
  handleToggleModelReview,
}: ModelsTabProps) {
  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Katalog Model Gateway & Status Peninjauan</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Daftar model yang terhubung via auto-sync cron atau discovery lokal.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={filterNeedsReview}
              onChange={(e) => setFilterNeedsReview(e.target.checked)}
            />
            Filter Perlu Tinjauan (needsReview)
          </label>
          <button onClick={fetchModels} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
            Refresh Model Catalog
          </button>
        </div>
      </div>

      {catalogModels.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          Belum ada model terdaftar (atau Admin Token belum diisi).
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                <th style={{ padding: 10 }}>Full Model ID</th>
                <th style={{ padding: 10 }}>Provider</th>
                <th style={{ padding: 10 }}>Fitur</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Needs Review</th>
                <th style={{ padding: 10 }}>Aksi Admin</th>
              </tr>
            </thead>
            <tbody>
              {catalogModels.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                    {m.id}
                  </td>
                  <td style={{ padding: 10 }}>{m.providerId}</td>
                  <td style={{ padding: 10, fontSize: 12 }}>
                    {m.supportsCoding && <span style={{ marginRight: 6, color: "var(--accent-purple)" }}>[Coding]</span>}
                    {m.supportsVision && <span style={{ color: "var(--accent-emerald)" }}>[Vision]</span>}
                    {!m.supportsCoding && !m.supportsVision && <span style={{ color: "var(--text-dim)" }}>[General]</span>}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span className={`status-badge status-${m.status || "active"}`}>{m.status || "active"}</span>
                  </td>
                  <td style={{ padding: 10 }}>
                    {m.needsReview ? (
                      <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>Perlu Tinjauan</span>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>Verified</span>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => handleToggleModelReview(m.id, m.needsReview)}
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      {m.needsReview ? "Tandai Terverifikasi" : "Tandai Perlu Tinjauan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
