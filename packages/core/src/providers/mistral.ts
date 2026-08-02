import { createOpenAICompatibleAdapter } from "./factory";

export const mistralAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "mistral", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "mistral",
  baseUrl: "https://api.mistral.ai/v1",
});
