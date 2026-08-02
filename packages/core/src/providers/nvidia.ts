import { createOpenAICompatibleAdapter } from "./factory";

export const nvidiaAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "nvidia", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "nvidia",
  baseUrl: "https://integrate.api.nvidia.com/v1",
});
