"use client";

import React, { useState } from "react";

export function getSnippetText(tool: string, token: string, origin: string): string {
  switch (tool) {
    case "hermes-agent":
      return `hermes config set model.provider custom\nhermes config set model.base_url ${origin}/v1\nhermes config set model.api_key ${token}\nhermes config set model.default auto`;
    case "claude-code":
      return `export ANTHROPIC_BASE_URL="${origin}/v1"\nexport ANTHROPIC_API_KEY="${token}"`;
    case "kilo-code":
      return `baseUrl: ${origin}/v1\napiKey: ${token}\nmodel: auto`;
    case "openclaw":
      return `baseUrl: ${origin}/v1\napiKey: ${token}\nprimaryModel: free-ai-gateway/auto`;
    case "cursor":
      return `OpenAI Base URL: ${origin}/v1\nAPI Key: ${token}\nModels to add: auto, kode-terbaik, groq/openai/gpt-oss-120b`;
    case "cline":
      return `Provider: OpenAI Compatible\nBase URL: ${origin}/v1\nAPI Key: ${token}\nModel ID: auto`;
    case "continue-dev":
      return `models:\n  - name: Free AI Gateway\n    provider: openai\n    model: auto\n    apiBase: ${origin}/v1\n    apiKey: ${token}`;
    case "openhands":
      return `export LLM_MODEL="openai/auto"\nexport LLM_API_KEY="${token}"\nexport LLM_BASE_URL="${origin}/v1"`;
    case "vercel-ai-sdk":
      return `import { createOpenAI } from '@ai-sdk/openai';\nconst gateway = createOpenAI({\n  baseURL: '${origin}/v1',\n  apiKey: '${token}',\n});`;
    case "crewai":
      return `from crewai import LLM\nllm = LLM(\n    model="auto",\n    base_url="${origin}/v1",\n    api_key="${token}",\n    custom_openai=True\n)`;
    case "pydantic-ai":
      return `from pydantic_ai import Agent\nfrom pydantic_ai.models.openai import OpenAIModel\nfrom pydantic_ai.providers.openai import OpenAIProvider\n\nprovider = OpenAIProvider(base_url="${origin}/v1", api_key="${token}")\nmodel = OpenAIModel("auto", provider=provider)\nagent = Agent(model)`;
    case "google-adk":
      return `from google.adk.models.lite_llm import LiteLlm\nllm = LiteLlm(\n    model="openai/auto",\n    base_url="${origin}/v1",\n    api_key="${token}"\n)`;
    case "aider":
      return `export OPENAI_API_BASE="${origin}/v1"\nexport OPENAI_API_KEY="${token}"\naider --model auto`;
    case "librechat":
      return `endpoints:\n  custom:\n    - name: "Free AI Gateway"\n      apiKey: "${token}"\n      baseURL: "${origin}/v1"\n      models:\n        default:\n          - "auto"`;
    case "sillytavern":
      return `API: Chat Completion\nSource: OpenAI-compatible\nBase URL: ${origin}/v1\nAPI Key: ${token}`;
    case "curl":
    default:
      return `curl ${origin}/v1/chat/completions \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "auto", "messages": [{"role": "user", "content": "Halo!"}]}'`;
  }
}

interface ConfigGeneratorWidgetProps {
  generatedRawToken: string;
  selectedConfigTool: string;
  setSelectedConfigTool: (tool: string) => void;
}

export default function ConfigGeneratorWidget({
  generatedRawToken,
  selectedConfigTool,
  setSelectedConfigTool,
}: ConfigGeneratorWidgetProps) {
  const [snippetCopied, setSnippetCopied] = useState(false);

  return (
    <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-cyan)" }}>
          ⚡ Generator Konfigurasi Tool:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={selectedConfigTool}
            onChange={(e) => {
              setSelectedConfigTool(e.target.value);
              setSnippetCopied(false);
            }}
            className="glass-input"
            style={{ fontSize: 11, padding: "3px 8px" }}
          >
            <option value="hermes-agent">Hermes Agent (#1)</option>
            <option value="claude-code">Claude Code CLI</option>
            <option value="kilo-code">Kilo Code</option>
            <option value="openclaw">OpenClaw</option>
            <option value="cursor">Cursor / Windsurf</option>
            <option value="cline">Cline / Roo Code</option>
            <option value="continue-dev">Continue.dev</option>
            <option value="openhands">OpenHands (OpenDevin)</option>
            <option value="vercel-ai-sdk">Vercel AI SDK (TS)</option>
            <option value="crewai">CrewAI (Python)</option>
            <option value="pydantic-ai">PydanticAI (Python)</option>
            <option value="google-adk">Google Agent Dev Kit (ADK)</option>
            <option value="aider">Aider CLI</option>
            <option value="librechat">LibreChat (Team UI)</option>
            <option value="sillytavern">SillyTavern UI</option>
            <option value="curl">cURL Generik</option>
          </select>
          <button
            onClick={() => {
              const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
              const text = getSnippetText(selectedConfigTool, generatedRawToken, origin);
              navigator.clipboard.writeText(text);
              setSnippetCopied(true);
              setTimeout(() => setSnippetCopied(false), 2000);
            }}
            className="glass-button"
            style={{
              fontSize: 11,
              padding: "3px 10px",
              background: snippetCopied ? "rgba(34, 197, 94, 0.2)" : "rgba(6, 182, 212, 0.2)",
              border: snippetCopied ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(6, 182, 212, 0.4)",
              color: snippetCopied ? "#86efac" : "#a5f3fc",
              fontWeight: 600,
            }}
          >
            {snippetCopied ? "✓ Copied!" : "📋 1-Click Copy"}
          </button>
        </div>
      </div>

      <pre
        style={{
          background: "rgba(0,0,0,0.6)",
          padding: 10,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "#a5f3fc",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {getSnippetText(selectedConfigTool, generatedRawToken, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}
      </pre>
    </div>
  );
}
