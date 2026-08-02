import { createOpenAICompatibleAdapter } from "./factory";

export const togetherAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "together", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "together",
  baseUrl: "https://api.together.xyz/v1",
});
