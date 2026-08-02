import { describe, it, expect } from "bun:test";
import { groqAdapter } from "./groq";
import { googleAdapter } from "./google";

describe("Provider Adapters", () => {
  it("groqAdapter harus membangun HTTP Request yang valid", async () => {
    const apiKey = "gsk_test123456789";
    const req = groqAdapter.buildRequest(apiKey, {
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: "Halo Groq!" }],
    });

    expect(req.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(req.headers.get("Authorization")).toBe(`Bearer ${apiKey}`);
    expect(req.headers.get("Content-Type")).toBe("application/json");

    const body = await req.json();
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.messages[0].content).toBe("Halo Groq!");
  });

  it("googleAdapter harus membangun Request dengan format OpenAI compatibility resmi Google", async () => {
    const apiKey = "AIzaSyTestKey123";
    const req = googleAdapter.buildRequest(apiKey, {
      model: "gemini-2.5-flash-lite",
      messages: [
        { role: "user", content: "Halo Gemini" },
        { role: "assistant", content: "Halo, ada yang bisa saya bantu?" },
      ],
    });

    expect(req.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(req.headers.get("Authorization")).toBe("Bearer AIzaSyTestKey123");
    expect(req.headers.get("Content-Type")).toBe("application/json");

    const body = await req.json();
    expect(body.model).toBe("gemini-2.5-flash-lite");
    expect(body.messages.length).toBe(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Halo Gemini");

    expect(googleAdapter.classifyError?.(new Response(null, { status: 404 }))).toBe("decommissioned");
  });

  it("customAdapter harus membangun Request dengan baseUrl kustom (misal Ollama/LM Studio)", async () => {
    const { createCustomAdapter, getProviderAdapter } = await import("./index");
    const adapter = createCustomAdapter("http://localhost:11434/v1");

    const req = adapter.buildRequest("dummy-key", {
      model: "llama3.2",
      messages: [{ role: "user", content: "Halo Ollama!" }],
    });

    expect(req.url).toBe("http://localhost:11434/v1/chat/completions");
    expect(req.headers.get("Authorization")).toBe("Bearer dummy-key");

    const body = await req.json();
    expect(body.model).toBe("llama3.2");
    expect(body.messages[0].content).toBe("Halo Ollama!");

    // Test helper getProviderAdapter
    const registeredCustom = getProviderAdapter("custom");
    expect(registeredCustom.id).toBe("custom");
  });

  it("cerebras, cloudflare, sambanova, dan mistral adapter harus terdaftar dan membangun HTTP Request yang valid", async () => {
    const { getProviderAdapter } = await import("./index");

    const cerebras = getProviderAdapter("cerebras");
    expect(cerebras.id).toBe("cerebras");
    const cerebrasReq = cerebras.buildRequest("csk-test123", {
      model: "llama-3.3-70b",
      messages: [{ role: "user", content: "Halo Cerebras" }],
    });
    expect(cerebrasReq.url).toBe("https://api.cerebras.ai/v1/chat/completions");

    const cloudflare = getProviderAdapter("cloudflare");
    expect(cloudflare.id).toBe("cloudflare");
    const cfReq = cloudflare.buildRequest("acc123:token456", {
      model: "@cf/meta/llama-3-8b-instruct",
      messages: [{ role: "user", content: "Halo Cloudflare" }],
    });
    expect(cfReq.url).toBe("https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions");
    expect(cfReq.headers.get("Authorization")).toBe("Bearer token456");

    const sambanova = getProviderAdapter("sambanova");
    expect(sambanova.id).toBe("sambanova");
    const sambaReq = sambanova.buildRequest("samba-key-123", {
      model: "Meta-Llama-3.3-70B-Instruct",
      messages: [{ role: "user", content: "Halo SambaNova" }],
    });
    expect(sambaReq.url).toBe("https://api.sambanova.ai/v1/chat/completions");

    const mistral = getProviderAdapter("mistral");
    expect(mistral.id).toBe("mistral");
    const mistralReq = mistral.buildRequest("mistral-key-123", {
      model: "mistral-small-latest",
      messages: [{ role: "user", content: "Halo Mistral" }],
    });
    expect(mistralReq.url).toBe("https://api.mistral.ai/v1/chat/completions");

    const nvidia = getProviderAdapter("nvidia");
    expect(nvidia.id).toBe("nvidia");
    const nvidiaReq = nvidia.buildRequest("nvapi-key-123", {
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "Halo NVIDIA" }],
    });
    expect(nvidiaReq.url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");

    const cohere = getProviderAdapter("cohere");
    expect(cohere.id).toBe("cohere");
    const cohereReq = cohere.buildRequest("coh-key-123", {
      model: "command-r-plus",
      messages: [{ role: "user", content: "Halo Cohere" }],
    });
    expect(cohereReq.url).toBe("https://api.cohere.com/v2/chat");

    const together = getProviderAdapter("together");
    expect(together.id).toBe("together");
    const togetherReq = together.buildRequest("tog-key-123", {
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: [{ role: "user", content: "Halo Together" }],
    });
    expect(togetherReq.url).toBe("https://api.together.xyz/v1/chat/completions");

    const hf = getProviderAdapter("huggingface");
    expect(hf.id).toBe("huggingface");
    const hfReq = hf.buildRequest("hf_token123", {
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [{ role: "user", content: "Halo HuggingFace" }],
    });
    expect(hfReq.url).toBe("https://api-inference.huggingface.co/v1/chat/completions");

    const kilo = getProviderAdapter("kilo");
    expect(kilo.id).toBe("kilo");
    const kiloReq = kilo.buildRequest("free", {
      model: "kilo-auto-free",
      messages: [{ role: "user", content: "Halo Kilo" }],
    });
    expect(kiloReq.url).toBe("https://api.kilo.ai/v1/chat/completions");

    const fireworks = getProviderAdapter("fireworks");
    expect(fireworks.id).toBe("fireworks");
    const fwReq = fireworks.buildRequest("fw-key-123", {
      model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      messages: [{ role: "user", content: "Halo Fireworks" }],
    });
    expect(fwReq.url).toBe("https://api.fireworks.ai/inference/v1/chat/completions");

    const novita = getProviderAdapter("novita");
    expect(novita.id).toBe("novita");
    const novitaReq = novita.buildRequest("nov-key-123", {
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "Halo Novita" }],
    });
    expect(novitaReq.url).toBe("https://api.novita.ai/v3/openai/chat/completions");

    const hyperbolic = getProviderAdapter("hyperbolic");
    expect(hyperbolic.id).toBe("hyperbolic");
    const hypReq = hyperbolic.buildRequest("hyp-key-123", {
      model: "deepseek-ai/DeepSeek-V3",
      messages: [{ role: "user", content: "Halo Hyperbolic" }],
    });
    expect(hypReq.url).toBe("https://api.hyperbolic.xyz/v1/chat/completions");
  });
});


