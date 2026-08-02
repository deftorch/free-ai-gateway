# 1. Base Image
FROM oven/bun:alpine AS base

# 2. Dependencies
# Salin package.json setiap workspace (bukan cuma root) agar `bun install`
# bisa resolve dependency workspace dengan benar dalam monorepo Turborepo.
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/free-ai-gateway-sdk/package.json ./packages/free-ai-gateway-sdk/package.json
RUN bun install --frozen-lockfile

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Build khusus workspace "gateway" saja (Turborepo filter) - workspace lain
# (worker, dsb.) tidak relevan untuk image Docker ini.
RUN bunx turbo run build --filter=gateway...

# 4. Runner (Node.js required for Next.js standalone output)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# `public/` bersifat opsional - hanya disalin jika ada, agar build tidak
# gagal ketika folder tersebut belum dibuat.
COPY --from=builder /app/apps/gateway/public ./apps/gateway/public

# Output "standalone" Next.js untuk app di dalam monorepo berada di
# apps/gateway/.next/standalone, BUKAN di root /app/.next/standalone.
# Struktur standalone output sudah menyertakan node_modules yang di-prune,
# sehingga server.js untuk workspace ini ada di apps/gateway/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/gateway/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/gateway/.next/static ./apps/gateway/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/gateway/server.js"]
