CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"label" text NOT NULL,
	"key_encrypted" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"cooldown_until" timestamp with time zone,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"quota_meta" jsonb DEFAULT '{}'::jsonb,
	"quota_scope_hint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"actor_hint" text DEFAULT 'admin',
	"details" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gateway_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_label" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"store_body" boolean DEFAULT true NOT NULL,
	"allowed_models" jsonb,
	"max_daily_requests" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" text NOT NULL,
	"key_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"latency_ms" integer,
	"tokens_per_sec" numeric,
	"success" boolean NOT NULL,
	"error_type" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"strategy" text NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "models" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"display_name" text NOT NULL,
	"context_window" integer,
	"input_price" numeric DEFAULT '0',
	"output_price" numeric DEFAULT '0',
	"released_at" date,
	"status" text DEFAULT 'active' NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb,
	"tags" text[] DEFAULT '{}',
	"weekly_tokens_estimate" bigint DEFAULT 0,
	"needs_review" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"auth_type" text NOT NULL,
	"catalog_source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_bodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_log_id" uuid NOT NULL,
	"prompt" jsonb,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"gateway_token_id" uuid,
	"model_requested" text NOT NULL,
	"model_used" text,
	"key_id" uuid,
	"latency_ms" integer,
	"status_code" integer,
	"tokens_in" integer,
	"tokens_out" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_bodies" ADD CONSTRAINT "request_bodies_request_log_id_request_logs_id_fk" FOREIGN KEY ("request_log_id") REFERENCES "public"."request_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_gateway_token_id_gateway_tokens_id_fk" FOREIGN KEY ("gateway_token_id") REFERENCES "public"."gateway_tokens"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_provider_id_status_idx" ON "api_keys" USING btree ("provider_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gateway_tokens_token_hash_idx" ON "gateway_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_timestamp_idx" ON "request_logs" USING btree ("timestamp");