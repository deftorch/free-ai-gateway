import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { providers, models } from "../src/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum di-set.");
  }
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  await db
    .insert(providers)
    .values([
      { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", authType: "bearer", catalogSource: "manual" },
      { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", authType: "bearer", catalogSource: "api" },
      { id: "google-ai-studio", name: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta", authType: "api-key-header", catalogSource: "manual" },
      { id: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai/v1", authType: "bearer", catalogSource: "manual" },
      { id: "sambanova", name: "SambaNova", baseUrl: "https://api.sambanova.ai/v1", authType: "bearer", catalogSource: "manual" },
      { id: "hyperbolic", name: "Hyperbolic", baseUrl: "https://api.hyperbolic.xyz/v1", authType: "bearer", catalogSource: "manual" },
      { id: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1", authType: "bearer", catalogSource: "manual" },
      { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", authType: "bearer", catalogSource: "manual" },
      { id: "cerebras", name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", authType: "bearer", catalogSource: "manual" },
      { id: "cohere", name: "Cohere", baseUrl: "https://api.cohere.com/v2", authType: "bearer", catalogSource: "manual" },
      { id: "fireworks", name: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", authType: "bearer", catalogSource: "manual" },
      { id: "novita", name: "Novita", baseUrl: "https://api.novita.ai/v3/openai", authType: "bearer", catalogSource: "manual" },
      { id: "huggingface", name: "HuggingFace", baseUrl: "https://api-inference.huggingface.co/v1", authType: "bearer", catalogSource: "manual" },
      { id: "kilo", name: "Kilo", baseUrl: "https://api.kilo.ai/v1", authType: "bearer", catalogSource: "manual" },
      { id: "cloudflare-workers-ai", name: "Cloudflare Workers AI", baseUrl: "https://api.cloudflare.com/client/v4/accounts", authType: "bearer", catalogSource: "manual" },
      { id: "custom", name: "Custom Provider", baseUrl: "", authType: "bearer", catalogSource: "manual" }
    ])
    .onConflictDoNothing();

  console.log("Seed provider selesai: 16 provider dimasukkan.");

  await db
    .insert(models)
    .values([
      { id: "openai/gpt-oss-120b", providerId: "groq", status: "active", contextWindow: 128000 },
      { id: "gemini-2.5-flash-lite", providerId: "google-ai-studio", status: "active", contextWindow: 2000000 },
      { id: "mistral-small-latest", providerId: "mistral", status: "active", contextWindow: 32000 },
    ])
    .onConflictDoNothing();

  console.log("Seed models selesai: beberapa model dasar dimasukkan.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
