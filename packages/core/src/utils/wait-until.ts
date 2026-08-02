import { waitUntil as vercelWaitUntil } from "@vercel/functions";

/**
 * Universal Cross-Platform `waitUntil` Adapter.
 * Mendukung Vercel, Netlify, Railway, Render, Docker Container, dan VPS Node.js runtime.
 * Menjalankan promise secara background non-blocking tanpa menunda response HTTP ke client.
 */
export function runBackground(promise: Promise<unknown>): void {
  // 1. Coba Vercel Serverless / Fluid Compute Runtime
  try {
    vercelWaitUntil(promise);
    return;
  } catch {
    // Abaikan jika bukan di Vercel
  }

  // 2. Coba Netlify Functions / Cloudflare Pages globalThis.waitUntil
  const g = globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void };
  if (typeof g.waitUntil === "function") {
    try {
      g.waitUntil(promise);
      return;
    } catch {
      // Abaikan jika gagal
    }
  }

  // 3. Fallback untuk Standalone Node.js / Docker / Railway / VPS
  promise.catch((err) => {
    console.error("[background-task-error]", err);
  });
}
