import type { ProviderAdapter } from "./types";
import { getEnvVar } from "../config/env";
import { providerRegistry } from "./registry";
import { groqAdapter } from "./groq";
import { openrouterAdapter } from "./openrouter";
import { googleAdapter } from "./google";
import { cerebrasAdapter } from "./cerebras";
import { cloudflareAdapter } from "./cloudflare";
import { sambanovaAdapter } from "./sambanova";
import { mistralAdapter } from "./mistral";
import { nvidiaAdapter } from "./nvidia";
import { cohereAdapter } from "./cohere";
import { togetherAdapter } from "./together";
import { huggingfaceAdapter } from "./huggingface";
import { kiloAdapter } from "./kilo";
import { fireworksAdapter } from "./fireworks";
import { novitaAdapter } from "./novita";
import { hyperbolicAdapter } from "./hyperbolic";
import { customAdapter, createCustomAdapter } from "./custom";

export * from "./types";
export * from "./custom";
export * from "./registry";

// Registrasi semua provider yang ada (Plugin Architecture)
providerRegistry.register(groqAdapter);
providerRegistry.register(openrouterAdapter);
providerRegistry.register(googleAdapter);
providerRegistry.register(cerebrasAdapter);
providerRegistry.register(cloudflareAdapter);
providerRegistry.register(sambanovaAdapter);
providerRegistry.register(mistralAdapter);
providerRegistry.register(nvidiaAdapter);
providerRegistry.register(cohereAdapter);
providerRegistry.register(togetherAdapter);
providerRegistry.register(huggingfaceAdapter);
providerRegistry.register(kiloAdapter);
providerRegistry.register(fireworksAdapter);
providerRegistry.register(novitaAdapter);
providerRegistry.register(hyperbolicAdapter);
providerRegistry.register(customAdapter);

export function getProviderAdapter(providerId: string, customBaseUrl?: string): ProviderAdapter {
  if (customBaseUrl) {
    return createCustomAdapter(customBaseUrl);
  }

  const adapter = providerRegistry.get(providerId);
  if (!adapter) {
    // Jika providerId berawalan "custom" atau URL, buat adapter custom secara terisolasi
    if (providerId.startsWith("custom") || providerId.startsWith("http")) {
      return customAdapter;
    }
    throw new Error(`Tidak ada adapter terdaftar untuk provider "${providerId}"`);
  }
  return adapter;
}

/**
 * Mendapatkan daftar ID provider yang diaktifkan melalui `ENABLED_PROVIDERS`.
 * Jika tidak di-set di env, seluruh provider terdaftar di registry dianggap aktif.
 */
export function getEnabledProviders(): string[] {
  const envVal = getEnvVar("ENABLED_PROVIDERS");
  if (!envVal || envVal.trim() === "") {
    return providerRegistry.getAll().map((a) => a.id);
  }
  return envVal
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
}

/**
 * Memeriksa apakah providerId tertentu diizinkan oleh allowlist ENABLED_PROVIDERS.
 */
export function isProviderEnabled(providerId: string): boolean {
  if (providerId.startsWith("custom") || providerId.startsWith("http")) {
    return true;
  }
  const enabled = getEnabledProviders();
  return enabled.includes(providerId.toLowerCase());
}


