/**
 * Cloudflare Worker Entry Point for Free AI Gateway
 * Zero-latency Edge AI Routing
 */

import { verifyGatewayTokenDetailed, processChatRequest, configureCoreEnv } from "@free-ai-gateway/core";
import { analyzeNetworkWAF } from "@free-ai-gateway/core";
import { configureDatabaseEnv } from "@free-ai-gateway/database";

export interface Env {
  // Bindings dan Env variables didefinisikan di sini
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  DATABASE_URL: string;
}

/**
 * `@free-ai-gateway/core` menerima config lewat dependency injection eksplisit
 * (lihat `packages/core/src/config/env.ts`), bukan lagi lewat mutasi
 * `globalThis.process` seperti sebelumnya. Cloudflare Workers menyediakan
 * config lewat parameter `env` per-request/per-isolate; `configureCoreEnv()`
 * meneruskan nilai itu ke core tanpa menyentuh object global sama sekali.
 *
 * `configureCoreEnv()` sengaja idempotent-friendly (merge, bukan replace) —
 * aman dipanggil di setiap request tanpa perlu flag "sudah pernah dipanggil"
 * manual seperti pola `injectEnvOnce()` sebelumnya. Di Cloudflare Workers,
 * nilai binding/secret pada `env` identik untuk setiap request pada
 * deployment yang sama, jadi memanggilnya berulang tidak menghasilkan nilai
 * yang salah/tertukar — hanya sedikit kerja redundan yang bisa diabaikan.
 *
 * CATATAN CAKUPAN (UPDATE): `packages/database` (dipakai lewat
 * `@free-ai-gateway/core` untuk akses Postgres/ClickHouse) sekarang PUNYA
 * modul DI sendiri juga — `configureDatabaseEnv()` dari
 * `@free-ai-gateway/database`, mengikuti pola yang sama persis dengan
 * `configureCoreEnv()`. Dipanggil terpisah (bukan digabung ke
 * `configureCoreEnv`) karena `packages/database` sengaja punya modul state
 * env sendiri yang independen dari `packages/core` — lihat catatan circular
 * dependency di `packages/database/src/config/env.ts`.
 */
function injectEnv(env: Env): void {
  configureCoreEnv({
    KV_REST_API_URL: env.UPSTASH_REDIS_REST_URL,
    KV_REST_API_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
    DATABASE_URL: env.DATABASE_URL,
  });
  configureDatabaseEnv({
    DATABASE_URL: env.DATABASE_URL,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    injectEnv(env);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
        return handleChatCompletion(request);
    }

    if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "edge-active", location: request.cf?.colo || "unknown" }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleChatCompletion(request: Request): Promise<Response> {
    const ip = request.headers.get("cf-connecting-ip") || "unknown-edge";
    const country = request.headers.get("cf-ipcountry") || undefined;
    
    // IP and Geo blocking via WAF
    const wafResult = await analyzeNetworkWAF(ip, country);
    if (!wafResult.allowed) {
      return new Response(JSON.stringify({ error: wafResult.reason || "Access Denied by WAF" }), { 
          status: wafResult.code || 403, 
          headers: { "Content-Type": "application/json" } 
      });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }

    // Ekstrak token
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Verifikasi Token
    const authResult = await verifyGatewayTokenDetailed(authHeader);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.statusCode || 401 });
    }

    try {
        const body = await request.json() as any;
        
        if (!body.model || !body.messages) {
            return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
        }

        // Process request
        const res = await processChatRequest({ token, body });
        
        // Return dengan injeksi CORS
        const finalRes = new Response(res.body, {
            status: res.statusCode,
            headers: res.headers
        });
        finalRes.headers.set("Access-Control-Allow-Origin", "*");
        
        return finalRes;

    } catch (e) {
        return new Response(JSON.stringify({ error: "Internal Server Edge Error" }), { status: 500 });
    }
}
