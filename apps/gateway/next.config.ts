import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gateway route selalu Node.js runtime (bukan Edge) — lihat catatan
  // di checklist §0: Edge Runtime deprecated untuk proyek baru di Vercel.
  reactStrictMode: true,
  output: "standalone",
  // Sengaja TIDAK meng-ignore error TypeScript/ESLint di sini (kecuali untuk test migrasi v16 ini).
  // Build produksi harus gagal jika ada type error atau pelanggaran lint,
  // supaya klaim "0 TypeScript errors" benar-benar ditegakkan oleh pipeline build,
  // bukan hanya oleh script `typecheck` terpisah yang bisa terlewat.
  serverExternalPackages: [
    "ioredis",
    "pg",
    "@clickhouse/client"
  ],
  // `ioredis` dipakai kondisional di `packages/core/src/kv/client.ts` untuk
  // mode self-hosted, tapi modul yang sama juga masuk ke dependency graph
  // Edge Middleware (middleware.ts -> validation/waf.ts -> kv/client.ts).
  // `ioredis` berisi `require("node:diagnostics_channel")` yang tidak ada di
  // Edge Runtime, jadi webpack GAGAL bundling middleware kalau `ioredis`
  // di-require biasa (dikonfirmasi lewat pengujian empiris — lihat dokumentasi
  // §13). `serverExternalPackages` di atas TIDAK mencakup ini karena hanya
  // berlaku untuk Route Handler/Server Component runtime Node.js, bukan Edge
  // Middleware. Solusi resmi: alias `ioredis` -> false khusus saat
  // `nextRuntime === "edge"`, supaya `require("ioredis")` di edge resolve ke
  // modul kosong (ditangkap oleh try/catch yang sudah ada di
  // `isSelfHostedModeActive()`, fallback ke memory mock) tanpa memengaruhi
  // runtime Node.js (Docker/self-hosted) yang memang butuh `ioredis` sungguhan.
  // Ini menggantikan trik string-concatenation `require("io"+"redis")` yang
  // dipakai sebelumnya untuk tujuan yang sama (menghindari static analysis
  // webpack) dengan mekanisme resmi next.config.js yang eksplisit.
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      config.resolve.alias = {
        ...config.resolve.alias,
        ioredis: false,
      };
    }
    return config;
  },
};

export default nextConfig;
