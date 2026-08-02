import { createOpenAICompatibleAdapter } from "./factory";

export const novitaAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "novita", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "novita",
  baseUrl: "https://api.novita.ai/v3/openai",
});
