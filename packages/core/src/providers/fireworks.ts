import { createOpenAICompatibleAdapter } from "./factory";

export const fireworksAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "fireworks", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "fireworks",
  baseUrl: "https://api.fireworks.ai/inference/v1",
});
