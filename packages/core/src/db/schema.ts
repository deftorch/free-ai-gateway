import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const virtualKeys = sqliteTable("virtual_keys", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the key
  keyPrefix: text("key_prefix").notNull(), // For UI masking e.g. fag_sk_1a2b
  scopes: text("scopes", { mode: "json" }).notNull(), // e.g. ["gemini", "nvidia-nim"]
  createdAt: text("created_at").notNull(),
});

export const providerKeys = sqliteTable("provider_keys", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(), // Dormant until Step 11
});



export const keyCooldowns = sqliteTable("key_cooldowns", {
  id: text("id").primaryKey(), // provider:keyHash
  provider: text("provider").notNull(),
  keyHash: text("key_hash").notNull(),
  cooldownUntil: integer("cooldown_until").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  uniqueProviderKey: unique().on(table.provider, table.keyHash),
}));
