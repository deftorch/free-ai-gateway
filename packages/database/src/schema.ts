import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uuid,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Skema ini mengikuti bagian 4 dokumen desain (free-ai-gateway-design.md).
 * Catatan implementasi:
 * - `key_encrypted` disimpan sebagai ciphertext base64 hasil AES-GCM (lihat lib/crypto).
 *   Kolom ini TIDAK PERNAH boleh dikembalikan mentah ke client manapun.
 * - `request_bodies` sengaja dipisah dari `request_logs` (lihat 4.7 & 8.2) supaya
 *   query dashboard yang sering diakses tidak menyentuh data sensitif.
 */

// 4.1 providers
export const providers = pgTable("providers", {
  id: text("id").primaryKey(), // e.g. 'openrouter', 'groq', 'google-ai-studio'
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").notNull(), // 'bearer' | 'api-key-header' | ...
  catalogSource: text("catalog_source").notNull(), // 'api' | 'manual' | 'scrape'
});

// 4.2 api_keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  label: text("label").notNull(),
  keyEncrypted: text("key_encrypted").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'cooldown' | 'disabled'
  cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
  errorCount: integer("error_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  quotaMeta: jsonb("quota_meta").$type<Record<string, unknown>>().default({}),
  // Catatan tambahan (lihat checklist §9.2): untuk provider yang menegakkan
  // limit per-project (mis. Google AI Studio), field ini membantu dashboard
  // menunjukkan apakah dua key berbagi kuota yang sama.
  quotaScopeHint: text("quota_scope_hint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // key-pool.ts melakukan `WHERE provider_id = ? AND status = 'active'` di
  // setiap request routing - ini query paling sering dieksekusi di seluruh
  // sistem, sebelumnya hanya mengandalkan sequential scan di belakang PK.
  // CATATAN: sintaks callback mengembalikan array (bukan object) karena
  // object-return sudah deprecated sejak drizzle-orm 0.36.0 (versi yang
  // dipakai proyek ini) - lihat https://orm.drizzle.team/docs/indexes-constraints
  index("api_keys_provider_id_status_idx").on(table.providerId, table.status),
]);

// Audit Logs Admin Trail
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  action: text("action").notNull(), // 'KEY_CREATED' | 'KEY_DELETED' | 'TOKEN_CREATED' | 'TOKEN_REVOKED' | 'CANARY_UPDATED' | 'CONFIG_IMPORTED'
  targetId: text("target_id"),
  actorHint: text("actor_hint").default("admin"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
});

// 4.3 models
export const models = pgTable("models", {
  id: text("id").primaryKey(), // e.g. 'openrouter/qwen3-coder:free'
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  displayName: text("display_name").notNull(),
  contextWindow: integer("context_window"),
  inputPrice: numeric("input_price").default("0"),
  outputPrice: numeric("output_price").default("0"),
  releasedAt: date("released_at"),
  status: text("status").notNull().default("active"), // 'active' | 'deprecated'
  limits: jsonb("limits").$type<Record<string, unknown>>().default({}),
  tags: text("tags").array().default([]),
  weeklyTokensEstimate: bigint("weekly_tokens_estimate", { mode: "number" }).default(0),
  needsReview: boolean("needs_review").notNull().default(false),
});

// 4.4 model_groups
export const modelGroups = pgTable("model_groups", {
  id: text("id").primaryKey(), // nama grup, mis. 'kode-terbaik'
  strategy: text("strategy").notNull(), // 'ordered' | 'load-balance' | 'fastest-first'
  members: jsonb("members").$type<Array<{ modelId: string; weight?: number; priority?: number }>>().default([]),
});

// 4.5 health_metrics
export const healthMetrics = pgTable("health_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelId: text("model_id").notNull(),
  keyId: uuid("key_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  latencyMs: integer("latency_ms"),
  tokensPerSec: numeric("tokens_per_sec"),
  success: boolean("success").notNull(),
  errorType: text("error_type"),
});

// 8.1 gateway_tokens
export const gatewayTokens = pgTable("gateway_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectLabel: text("project_label").notNull(),
  tokenHash: text("token_hash").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'revoked'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // 8.2: override retensi prompt/response per token, default tetap simpan
  storeBody: boolean("store_body").notNull().default(true),
  // Multi-Tenant Hardening & Permission Scope
  allowedModels: jsonb("allowed_models").$type<string[] | null>(),
  maxDailyRequests: integer("max_daily_requests"),
}, (table) => [
  // auth.ts melakukan `WHERE token_hash = ?` untuk memverifikasi SETIAP
  // request masuk ke gateway - jalur paling panas di seluruh sistem.
  // Unique index sekaligus menegakkan invariant "1 hash = 1 token".
  uniqueIndex("gateway_tokens_token_hash_idx").on(table.tokenHash),
]);

// 4.6 request_logs
export const requestLogs = pgTable("request_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  gatewayTokenId: uuid("gateway_token_id").references(() => gatewayTokens.id),
  modelRequested: text("model_requested").notNull(),
  modelUsed: text("model_used"),
  keyId: uuid("key_id"),
  latencyMs: integer("latency_ms"),
  statusCode: integer("status_code"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
}, (table) => [
  // Dashboard logs selalu `ORDER BY timestamp DESC` dengan filter tambahan;
  // tabel ini paling cepat bertumbuh besar dari semua tabel di skema ini,
  // jadi index di sini paling penting untuk performa jangka panjang.
  index("request_logs_timestamp_idx").on(table.timestamp),
]);

// 4.7 request_bodies — tabel terpisah, lihat catatan di atas & 8.2
export const requestBodies = pgTable("request_bodies", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestLogId: uuid("request_log_id")
    .notNull()
    .references(() => requestLogs.id),
  prompt: jsonb("prompt"),
  response: jsonb("response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
