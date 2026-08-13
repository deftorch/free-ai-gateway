import app from "./index";

/**
 * Entry point untuk self-host lewat Bun (`bun run dev`, atau Docker di
 * deploy/Dockerfile yang pakai image oven/bun). Untuk Cloudflare Workers,
 * `index.ts` yang dipakai langsung (default export Hono app) -- Workers punya
 * runtime listener sendiri.
 *
 * CATATAN: `hono/bun` TIDAK expose fungsi `serve` (cuma `serveStatic` untuk
 * file statis) -- percobaan pertama saya salah asumsi API ini, ketahuan lewat
 * `bun run typecheck` yang menolak `Module "hono/bun" has no exported member
 * 'serve'`. Cara yang benar: panggil `Bun.serve()` bawaan runtime langsung,
 * dengan `fetch: app.fetch` dari Hono app.
 *
 * Env var (`.env`) dimuat lewat flag `bun --env-file=../../.env` di script
 * `dev` package.json ini, BUKAN library seperti dotenv -- Bun sudah punya
 * dukungan native untuk ini.
 */
const port = Number(Bun.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Free AI Gateway listening on http://localhost:${server.port}`);
