# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4.4-alpine AS deps
WORKDIR /app
ENV HUSKY=0

COPY package.json bun.lock turbo.json ./
COPY apps/site/package.json ./apps/site/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/wasm-playground/package.json ./packages/wasm-playground/package.json

RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN bun run --filter @tydbase/site build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/public ./apps/site/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "apps/site/server.js"]
