import { KeyPoolManager } from "./key-pool";
import { keyCooldowns } from "../db/schema";
import { eq } from "drizzle-orm";
import { db as dbInstance } from "../db/index";
import { createHash } from "crypto";

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
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 0);

  if (keys.length === 0) {
    throw new Error(`${envVarName} belum diset di .env. Isi minimal 1 key ${providerName} sebelum menjalankan server.`);
  }

  pools[providerName] = new KeyPoolManager(keys);
  return pools[providerName];
}

/**
 * Records a cooldown for a specific key both in-memory and persistently in DB.
 */
export async function recordCooldown(providerName: string, key: string, retryAfterMs?: number): Promise<void> {
  const pool = getProviderPool(providerName);
  pool.markCooldown(key, retryAfterMs);
  
  const cooldownUntil = pool.getCooldownUntil(key) || (Date.now() + 30000);

  const keyHash = createHash("sha256").update(key).digest("hex");
  const id = `${providerName}:${keyHash}`;
  
  await dbInstance.insert(keyCooldowns).values({
    id,
    provider: providerName,
    keyHash,
    cooldownUntil,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: [keyCooldowns.provider, keyCooldowns.keyHash],
    set: {
      cooldownUntil,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Validates and initializes all registered provider pools.
 * Call this at server startup to fail-fast if any environment variables are missing.
 * Recovers cooldown state from the database.
 */
export async function initializeAllPools() {
  for (const provider of Object.keys(envVarByProvider)) {
    const pool = getProviderPool(provider);
    
    // Recovery state
    const rows = await dbInstance.select().from(keyCooldowns).where(
      eq(keyCooldowns.provider, provider)
    );
    
    // Create a set of active hashes to fast check
    const dbCooldowns = new Map<string, number>();
    for (const row of rows) {
      if (row.cooldownUntil > Date.now()) {
        dbCooldowns.set(row.keyHash, row.cooldownUntil);
      }
    }
    
    // Apply to pool if the key is in env and in db
    const envVarName = envVarByProvider[provider];
    if (!envVarName) continue;
    const envValue = process.env[envVarName] || "";
    const keys = envValue.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    
    for (const key of keys) {
      const hash = createHash("sha256").update(key).digest("hex");
      if (dbCooldowns.has(hash)) {
        const cooldownUntil = dbCooldowns.get(hash)!;
        const remainingMs = cooldownUntil - Date.now();
        if (remainingMs > 0) {
          pool.markCooldown(key, remainingMs);
        }
      }
    }
  }
}

export function clearPools() {
  for (const key of Object.keys(pools)) {
    delete pools[key];
  }
}

export { KeyPoolManager, NoAvailableKeyError } from "./key-pool";
