import { KeyPoolManager } from "./key-pool";

const pools: Record<string, KeyPoolManager> = {};

/** Registry map provider ID -> nama Env Var */
export const envVarByProvider: Record<string, string> = {
  "gemini": "GEMINI_API_KEYS",
  "nvidia-nim": "NVIDIA_API_KEYS",
};

/**
 * Initializes and returns the KeyPoolManager for a specific provider.
 * Reads the keys from environment variables (comma-separated).
 */
export function getProviderPool(providerName: string): KeyPoolManager {
  if (pools[providerName]) {
    return pools[providerName];
  }

  const envVarName = envVarByProvider[providerName];
  if (!envVarName) {
    throw new Error(`Provider '${providerName}' tidak terdaftar di registry env var.`);
  }

  const envValue = process.env[envVarName] || "";

  const keys = envValue
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keys.length === 0) {
    throw new Error(`${envVarName} belum diset di .env. Isi minimal 1 key ${providerName} sebelum menjalankan server.`);
  }

  pools[providerName] = new KeyPoolManager(keys);
  return pools[providerName];
}

/**
 * Validates and initializes all registered provider pools.
 * Call this at server startup to fail-fast if any environment variables are missing.
 */
export function initializeAllPools() {
  for (const provider of Object.keys(envVarByProvider)) {
    getProviderPool(provider);
  }
}

export function clearPools() {
  for (const key of Object.keys(pools)) {
    delete pools[key];
  }
}

export { KeyPoolManager, NoAvailableKeyError } from "./key-pool";
