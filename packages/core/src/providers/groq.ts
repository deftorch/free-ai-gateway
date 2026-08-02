import { createOpenAICompatibleAdapter } from "./factory";

/**
 * Groq API OpenAI-compatible di /openai/v1
 */
export const groqAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "groq", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "groq",
  baseUrl: "https://api.groq.com/openai/v1",
});
