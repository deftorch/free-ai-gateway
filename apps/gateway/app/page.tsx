"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [activeCodeTab, setActiveCodeTab] = useState<"nodejs" | "python" | "anthropic" | "ollama">("nodejs");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* NAVIGATION BAR */}
      <header
        style={{
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(3, 7, 18, 0.75)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              color: "#0f172a",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
            }}
          >
            AI
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>Free AI Gateway</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Multi-Key Load Balancer & Proxy</div>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/v1/docs" style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none" }}>
            Dokumentasi API
          </Link>
          <Link href="/v1/openapi.json" style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none" }}>
            OpenAPI Spec
          </Link>
          <Link href="/dashboard" className="btn-primary">
            Buka Dashboard Admin
          </Link>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section style={{ padding: "80px 24px 60px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div className="animate-slide-up">
          <div style={{ display: "inline-flex", gap: 8, marginBottom: 20 }}>
            <span className="status-badge status-active">
              <span className="pulse-dot"></span> v1.3 Production Ready
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 20,
                background: "rgba(129, 140, 248, 0.12)",
                color: "var(--accent-indigo)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                fontWeight: 600,
              }}
            >
              15 Provider LLM Gratis
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginBottom: 24,
            }}
          >
            Unified AI Gateway & <br />
            <span className="gradient-text">Multi-Key Load Balancer</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--text-muted)",
              maxWidth: 780,
              margin: "0 auto 36px",
              lineHeight: 1.6,
            }}
          >
            Satu endpoint universal kompatibel dengan SDK OpenAI & Anthropic untuk mengakses kuota 15 provider LLM gratis secara paralel dengan rotasi key otomatis, zero downtime, dan emulasi Ollama native.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard" className="btn-primary" style={{ padding: "14px 28px", fontSize: 16 }}>
              Buka Dashboard Admin
            </Link>
            <Link href="/v1/docs" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
              Eksplorasi Swagger UI
            </Link>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE METRICS BANNER */}
      <section style={{ padding: "0 24px 60px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div
          className="glass-panel"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 24,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>15 Adapters</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Integrated Free Providers</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-emerald)" }}>79 / 79</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Unit Test Suites Passed</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-indigo)" }}>&lt; 5 ms</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Router Overhead Latency</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-purple)" }}>AES-256-GCM</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Encrypted API Key Pool</div>
          </div>
        </div>
      </section>

      {/* CODE INTEGRATION SNIPPET SHOWCASE */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div className="glass-panel" style={{ padding: 36 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Integrasi Instant Satu Baris Kode</h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Ganti <code>baseURL</code> pada aplikasi Anda ke URL Free AI Gateway dan gunakan Gateway Token sebagai Authorization Bearer.
            </p>
          </div>

          {/* CODE TAB SELECTOR */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
            {[
              { id: "nodejs", label: "Node.js (OpenAI SDK)" },
              { id: "python", label: "Python (OpenAI SDK)" },
              { id: "anthropic", label: "Anthropic / Claude CLI" },
              { id: "ollama", label: "Ollama / Zed IDE" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCodeTab(tab.id as "nodejs" | "python" | "anthropic" | "ollama")}
                className={activeCodeTab === tab.id ? "btn-primary" : "btn-secondary"}
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CODE BLOCK */}
          <div
            style={{
              background: "rgba(10, 15, 26, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            {activeCodeTab === "nodejs" && (
              <pre style={{ margin: 0, color: "#e2e8f0" }}>
                <span style={{ color: "#c084fc" }}>import</span> OpenAI <span style={{ color: "#c084fc" }}>from</span> <span style={{ color: "#34d399" }}>&quot;openai&quot;</span>;{"\n\n"}
                <span style={{ color: "#c084fc" }}>const</span> openai = <span style={{ color: "#c084fc" }}>new</span> OpenAI({"{\n"}
                {"  "}baseURL: <span style={{ color: "#34d399" }}>&quot;http://localhost:3000/v1&quot;</span>, <span style={{ color: "#64748b" }}>{"// atau URL Vercel gateway Anda"}</span>{"\n"}
                {"  "}apiKey: <span style={{ color: "#34d399" }}>&quot;gw_live_your_gateway_token&quot;</span>,{"\n"}
                {"}"});{"\n\n"}
                <span style={{ color: "#c084fc" }}>const</span> response = <span style={{ color: "#c084fc" }}>await</span> openai.chat.completions.create({"{\n"}
                {"  "}model: <span style={{ color: "#34d399" }}>&quot;auto&quot;</span>, <span style={{ color: "#64748b" }}>{"// Smart Router klasifikasi otomatis (coding/vision/general)"}</span>{"\n"}
                {"  "}messages: [{"{"} role: <span style={{ color: "#34d399" }}>&quot;user&quot;</span>, content: <span style={{ color: "#34d399" }}>&quot;Buatkan fungsi sorting array di TypeScript&quot;</span> {"}"}],{"\n"}
                {"}"});{"\n\n"}
                console.log(response.choices[0].message.content);
              </pre>
            )}

            {activeCodeTab === "python" && (
              <pre style={{ margin: 0, color: "#e2e8f0" }}>
                <span style={{ color: "#c084fc" }}>from</span> openai <span style={{ color: "#c084fc" }}>import</span> OpenAI{"\n\n"}
                client = OpenAI({"{\n"}
                {"  "}base_url=<span style={{ color: "#34d399" }}>&quot;http://localhost:3000/v1&quot;</span>,{"\n"}
                {"  "}api_key=<span style={{ color: "#34d399" }}>&quot;gw_live_your_gateway_token&quot;</span>,{"\n"}
                {"}"}){"\n\n"}
                response = client.chat.completions.create({"{\n"}
                {"  "}model=<span style={{ color: "#34d399" }}>&quot;groq/openai/gpt-oss-120b&quot;</span>,{"\n"}
                {"  "}messages=[{"{"}&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Jelaskan konsep RAG secara singkat&quot;{"}"}],{"\n"}
                {"}"}){"\n\n"}
                print(response.choices[0].message.content)
              </pre>
            )}

            {activeCodeTab === "anthropic" && (
              <pre style={{ margin: 0, color: "#e2e8f0" }}>
                <span style={{ color: "#64748b" }}># Memanggil Anthropic Messages API Surface (/v1/messages)</span>{"\n"}
                curl -X POST http://localhost:3000/v1/messages \{ "\n" }
                {"  "}-H <span style={{ color: "#34d399" }}>&quot;x-api-key: gw_live_your_gateway_token&quot;</span> \{ "\n" }
                {"  "}-H <span style={{ color: "#34d399" }}>&quot;anthropic-version: 2023-06-01&quot;</span> \{ "\n" }
                {"  "}-H <span style={{ color: "#34d399" }}>&quot;Content-Type: application/json&quot;</span> \{ "\n" }
                {"  "}-d <span style={{ color: "#34d399" }}>{"'{\n    \"model\": \"auto\",\n    \"messages\": [{\"role\": \"user\", \"content\": \"Halo Claude\"}]\n  }'"}</span>
              </pre>
            )}

            {activeCodeTab === "ollama" && (
              <pre style={{ margin: 0, color: "#e2e8f0" }}>
                <span style={{ color: "#64748b" }}># Konfigurasi Zed IDE / Ollama CLI ke Free AI Gateway</span>{"\n"}
                <span style={{ color: "#64748b" }}># Emulasi Native Route: GET /api/tags & POST /api/chat</span>{"\n\n"}
                OLLAMA_HOST=<span style={{ color: "#34d399" }}>&quot;http://localhost:3000&quot;</span> ollama run auto
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS GRID */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 40 }}>
          Arsitektur Kunci & Fitur Unggulan
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              MULTI-PROVIDER ADAPTERS
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>15 Provider LLM Terintegrasi</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Dukungan native untuk Groq, OpenRouter, Google AI Studio, Cerebras, Cloudflare, SambaNova, Mistral, NVIDIA NIM, Cohere, Together, HuggingFace, Kilo, Fireworks, Novita, dan Hyperbolic.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--accent-indigo)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              SMART TASK ROUTING
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Klasifikasi Prompt Otomatis</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Alias <code>auto</code> secara cerdas mengarahkan request coding ke model seperti Llama 3.3 / Qwen Coder, dan request bermuatan gambar ke Gemini 2.0 Flash secara otomatis.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--accent-emerald)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              ENTERPRISE SECURITY
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Enkripsi Key AES-256-GCM</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Seluruh API key provider disimpannya dalam bentuk ciphertext terenkripsi AES-GCM. Gateway Token proyek dilindungi dengan hashing SHA-256 dan rate limit per token.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--accent-purple)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              NATIVE OLLAMA EMULATION
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Plug-and-Play IDE Integration</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Mendukung route `/api/tags` dan `/api/chat` berformat Ollama native untuk dihubungkan langsung ke Zed IDE, Cursor, atau ekstensi VSCode tanpa perantara tambahan.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--accent-amber)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              FAILOVER & CIRCUIT BREAKER
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tombstoning & Health Probing</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Secara otomatis mengisolasi key yang mengalami rate-limit 429 atau kuota habis, serta melakukan failover transparan ke provider cadangan tanpa menghentikan request pengguna.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, marginBottom: 8, letterSpacing: "1px" }}>
              VECTOR EMBEDDINGS & MESSAGES
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Full Surface OpenAPI Spec</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Menyediakan endpoint <code>/v1/embeddings</code> untuk pencarian vektor RAG serta <code>/v1/messages</code> untuk kompatibilitas Anthropic SDK penuh.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          marginTop: "auto",
          padding: "32px 40px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(3, 7, 18, 0.9)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Free AI Gateway &bull; Unified OpenAI-compatible Load Balancer & Proxy
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            Dashboard Admin
          </Link>
          <Link href="/v1/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            Swagger UI Docs
          </Link>
          <Link href="/v1/openapi.json" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            OpenAPI Spec
          </Link>
        </div>
      </footer>
    </div>
  );
}
