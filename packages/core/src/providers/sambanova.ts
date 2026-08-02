import { createOpenAICompatibleAdapter } from "./factory";

export const sambanovaAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "sambanova", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "sambanova",
  baseUrl: "https://api.sambanova.ai/v1",
});
