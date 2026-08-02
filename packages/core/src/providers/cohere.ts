import { createOpenAICompatibleAdapter } from "./factory";

export const cohereAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "cohere", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "cohere",
  baseUrl: "https://api.cohere.com/v2",
  endpointPath: "/chat",
});
