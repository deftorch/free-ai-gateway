import { createOpenAICompatibleAdapter } from "./factory";
import { getEnvVarOrDefault } from "../config/env";

/**
 * OpenRouter AI Adapter (OpenAI-compatible)
 */
export const openrouterAdapter = createOpenAICompatibleAdapter({
  manifest: { name: "openrouter", capabilities: { streaming: true, vision: false, toolCalling: false }, pricing: "free-tier-available" },
  id: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  // Function (bukan object statis) agar env dibaca per-request, bukan
  // di-"bekukan" saat modul ini di-import (lihat catatan DI di factory.ts).
  defaultHeaders: () => ({
    "HTTP-Referer": getEnvVarOrDefault("GATEWAY_PUBLIC_URL", "http://localhost:3000"),
    "X-Title": "Free AI Gateway",
  }),
});
