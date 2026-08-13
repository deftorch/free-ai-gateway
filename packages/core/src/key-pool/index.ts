import { KeyPoolManager } from "./key-pool";

const pools: Record<string, KeyPoolManager> = {};

/**
 * Initializes and returns the KeyPoolManager for a specific provider.
 * Reads the keys from environment variables (comma-separated).
 */
export function getProviderPool(providerName: string): KeyPoolManager {
  if (pools[providerName]) {
    return pools[providerName];
  }

  // The env var mapping is standard: GEMINI_API_KEYS, NVIDIA_NIM_API_KEYS, etc.
  const envVarName = `${providerName.toUpperCase().replace(/-/g, "_")}_API_KEYS`;
  const envValue = process.env[envVarName] || "";

  const keys = envValue
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keys.length === 0) {
    throw new Error(`Kredensial untuk provider '${providerName}' tidak ditemukan di env var ${envVarName}.`);
  }

  pools[providerName] = new KeyPoolManager(keys);
  return pools[providerName];
}

export { KeyPoolManager };
