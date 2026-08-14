# Image resmi Bun -- runtime + package manager jadi satu, tidak perlu Node terpisah.
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/mcp-server/package.json packages/mcp-server/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY adapters/gemini/package.json adapters/gemini/package.json
COPY adapters/nvidia-nim/package.json adapters/nvidia-nim/package.json
COPY adapters/_contract-tests/package.json adapters/_contract-tests/package.json
COPY packages/web/package.json packages/web/package.json
RUN bun install --frozen-lockfile --ignore-scripts || bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app .

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8787/healthz || exit 1

CMD ["bun", "run", "packages/server/src/serve.ts"]
