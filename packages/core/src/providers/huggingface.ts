import { createOpenAICompatibleAdapter } from "./factory";

export const huggingfaceAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "huggingface", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "huggingface",
  baseUrl: "https://api-inference.huggingface.co/v1",
});
