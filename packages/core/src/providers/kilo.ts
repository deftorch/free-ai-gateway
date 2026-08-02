import { createOpenAICompatibleAdapter } from "./factory";

export const kiloAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "kilo", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "kilo",
  baseUrl: "https://api.kilo.ai/v1",
});
