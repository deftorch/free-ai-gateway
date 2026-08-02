import { createOpenAICompatibleAdapter } from "./factory";

/**
 * Cerebras AI Adapter (OpenAI-compatible ultra-fast inference)
 */
export const cerebrasAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "cerebras", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "cerebras",
  baseUrl: "https://api.cerebras.ai/v1",
});
