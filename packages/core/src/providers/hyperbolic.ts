import { createOpenAICompatibleAdapter } from "./factory";

export const hyperbolicAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "hyperbolic", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "hyperbolic",
  baseUrl: "https://api.hyperbolic.xyz/v1",
});
