import { Redis as UpstashRedis } from "@upstash/redis";
import { getEnvVar, getEnvVarOrDefault } from "../config/env";

export interface UnifiedKVClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

function isUpstashConfigured(): boolean {
  return Boolean(getEnvVar("KV_REST_API_URL") && getEnvVar("KV_REST_API_TOKEN"));
}

function isSelfHostedRedisConfigured(): boolean {
  return Boolean(getEnvVar("REDIS_URL") || getEnvVar("REDIS_HOST"));
}

export function isSelfHostedModeActive(): boolean {
  const storageMode = getEnvVarOrDefault("STORAGE_MODE", "serverless");
  return storageMode === "selfhosted" || isSelfHostedRedisConfigured();
}

export function isKvStoreConfigured(): boolean {
  return isUpstashConfigured() || isSelfHostedModeActive();
}

function createKVClient(): UnifiedKVClient {
  // Dukungan Upstash (Edge-ready), IORedis (Node.js), atau Memory Mock
  // PENTING (DI): semua pembacaan env di sini terjadi SAAT client dibuat
  // (lazy, lewat getKVClient() di bawah), bukan saat modul ini di-import.
  // Ini memastikan runtime seperti Cloudflare Worker yang meng-inject config
  // lewat `configureCoreEnv()` di dalam `fetch()` handler tetap mendapat
  // nilai env yang benar, bukan `undefined` dari sebelum config di-set.

  if (isSelfHostedModeActive()) {
    let redisClient: any;
    try {
      // (Lihat konfigurasi `webpack()` di apps/gateway/next.config.ts untuk
      // cara ioredis dikecualikan dari bundle Edge Middleware secara resmi —
      // require() biasa di sini sekarang aman, tidak butuh trik obfuscation.)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = ["io", "redis"].join("");
      const { Redis } = require(pkg);
      redisClient = new Redis(getEnvVar("REDIS_URL") || getEnvVar("REDIS_HOST") || "redis://localhost:6379");
    } catch (e) {
      console.warn("[KV Fallback] IORedis tidak bisa diload, jatuh ke memory mock");
    }

    if (redisClient) {
      return {
        get: async (key: string) => {
          const val = await redisClient.get(key);
          if (val === null) return null;
          try { return JSON.parse(val); } catch { return val; }
        },
        set: async (key: string, value: any, opts?: { ex?: number }) => {
          const strVal = typeof value === "string" ? value : JSON.stringify(value);
          if (opts?.ex) {
            return await redisClient.set(key, strVal, "EX", opts.ex);
          }
          return await redisClient.set(key, strVal);
        },
        del: async (key: string) => await redisClient.del(key),
        incr: async (key: string) => await redisClient.incr(key),
        expire: async (key: string, seconds: number) => await redisClient.expire(key, seconds),
      };
    }
  }

  if (isUpstashConfigured()) {
    const upstash = new UpstashRedis({
      url: getEnvVar("KV_REST_API_URL")!,
      token: getEnvVar("KV_REST_API_TOKEN")!,
    });
    
    // CRDT Fallback State (Langkah 3.1)
    const fallbackStore = new Map<string, { value: any; expireAt?: number }>();
    const pendingIncr = new Map<string, number>();

    const flushPending = async () => {
      if (pendingIncr.size === 0) return;
      const entries = Array.from(pendingIncr.entries());
      pendingIncr.clear();
      for (const [key, val] of entries) {
        try {
          await upstash.incrby(key, val);
        } catch {
          pendingIncr.set(key, (pendingIncr.get(key) || 0) + val);
        }
      }
    };

    return {
      get: async (key: string) => {
        try {
          return await upstash.get(key);
        } catch (e) {
          console.warn(`[KV Fallback] Read dari local memory untuk key ${key}`);
          return fallbackStore.get(key)?.value || null;
        }
      },
      set: async (key: string, value: any, opts?: { ex?: number }) => {
        try {
          if (opts?.ex) {
            return await upstash.set(key, value, { ex: opts.ex });
          }
          return await upstash.set(key, value);
        } catch (e) {
          fallbackStore.set(key, { value, expireAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
          return "OK";
        }
      },
      del: async (key: string) => {
        try {
          return await upstash.del(key);
        } catch {
          return fallbackStore.delete(key) ? 1 : 0;
        }
      },
      incr: async (key: string) => {
        try {
          if (pendingIncr.size > 0) flushPending().catch((e) => { console.error('[SilentError]', e); });
          return await upstash.incr(key);
        } catch (e) {
          console.warn(`[KV Fallback] Increment asinkron (CRDT) untuk key ${key}`);
          const current = (fallbackStore.get(key)?.value || 0) as number;
          const next = Number(current) + 1;
          fallbackStore.set(key, { value: next });
          pendingIncr.set(key, (pendingIncr.get(key) || 0) + 1);
          return next;
        }
      },
      expire: async (key: string, seconds: number) => {
        try {
          return await upstash.expire(key, seconds);
        } catch {
          return 1;
        }
      }
    };
  }

  // Memory Mock Fallback untuk unit test / dev tanpa Redis
  const memoryStore = new Map<string, { value: any; expireAt?: number }>();
  return {
    get: async (key: string) => {
      const item = memoryStore.get(key);
      if (!item) return null;
      if (item.expireAt && Date.now() > item.expireAt) {
        memoryStore.delete(key);
        return null;
      }
      return item.value;
    },
    set: async (key: string, value: any, opts?: { ex?: number }) => {
      const expireAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
      memoryStore.set(key, { value, expireAt });
      return "OK";
    },
    del: async (key: string) => (memoryStore.delete(key) ? 1 : 0),
    incr: async (key: string) => {
      const current = (memoryStore.get(key)?.value || 0) as number;
      const next = Number(current) + 1;
      memoryStore.set(key, { value: next });
      return next;
    },
    expire: async (key: string, seconds: number) => {
      const item = memoryStore.get(key);
      if (item) {
        item.expireAt = Date.now() + seconds * 1000;
        return 1;
      }
      return 0;
    },
  };
}

let kvSingleton: UnifiedKVClient | null = null;

/**
 * Ambil instance KV client (lazy singleton). Dibuat pertama kali dipakai,
 * BUKAN saat modul di-import — supaya `configureCoreEnv()` (Worker) atau
 * `.env` (Node) sempat ke-load lebih dulu.
 */
export function getKVClient(): UnifiedKVClient {
  if (!kvSingleton) {
    kvSingleton = createKVClient();
  }
  return kvSingleton;
}

/**
 * @deprecated Pertahankan nama export lama `kv` untuk kompatibilitas mundur
 * (dipakai luas di router/rate-limiter/dll). Secara internal proxy ini
 * menunda pembuatan client sampai method pertama benar-benar dipanggil,
 * sehingga tetap lazy meski gaya importnya terlihat seperti objek biasa.
 */
export const kv: UnifiedKVClient = {
  get: (key) => getKVClient().get(key),
  set: (key, value, opts) => getKVClient().set(key, value, opts),
  del: (key) => getKVClient().del(key),
  incr: (key) => getKVClient().incr(key),
  expire: (key, seconds) => getKVClient().expire(key, seconds),
};

export function getTodayUTCDateString(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getSecondsUntilUTCMidnight(): number {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.max(1, Math.floor((utcMidnight.getTime() - now.getTime()) / 1000));
}

// --- Helper key-key Redis yang dipakai router (lib/router) ---
export const kvKeys = {
  cooldown: (apiKeyId: string) => `cooldown:${apiKeyId}`,
  errorStreak: (apiKeyId: string) => `errstreak:${apiKeyId}`,
  backoffLevel: (apiKeyId: string) => `backoff:${apiKeyId}`,
  lastUsed: (apiKeyId: string) => `lastused:${apiKeyId}`,
  healthScore: (modelId: string) => `health:${modelId}`,
  rrIndex: (providerId: string) => `rr:${providerId}`,
  rpdCount: (apiKeyId: string, dateStr: string = getTodayUTCDateString()) => `rpd:${apiKeyId}:${dateStr}`,
  tpdCount: (apiKeyId: string, dateStr: string = getTodayUTCDateString()) => `tpd:${apiKeyId}:${dateStr}`,
  rpmCount: (apiKeyId: string) => `rpm:${apiKeyId}:${Math.floor(Date.now() / 60000)}`,
  tokenRpdCount: (tokenId: string, dateStr: string = getTodayUTCDateString()) => `token_rpd:${tokenId}:${dateStr}`,
  chaosOutage: (providerId: string) => `chaos:outage:${providerId}`,
  canaryRule: (groupName: string) => `canary:rule:${groupName}`,
};
