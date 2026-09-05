# DDB — Zeabur / Docker（Next.js standalone + Playwright Chromium）
# Zeabur 注入 PORT（通常 8080）；本機可用 PORT=5003

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

# Prisma CLI + transitive deps (effect, c12, …) for runtime `db push`.
# Selective copy of prisma/@prisma alone omits those packages and crashes start.sh.
FROM node:20-bookworm-slim AS prisma-cli
WORKDIR /cli
RUN npm install prisma@6.19.3 --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Help Prisma detect OpenSSL on slim images (still set binaryTargets for jammy runner).
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder only so Prisma Client can generate / Next can compile.
# Runtime DATABASE_URL comes from Zeabur Variables (internal Postgres host).
# Build must NOT open a real DB — shell routes are force-dynamic + bootstrap skips NEXT_PHASE=phase-production-build.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npx prisma generate && npm run build

# Official Playwright image: Chromium + system deps for 網頁取數（Ubuntu 22.04 / OpenSSL 3）
FROM mcr.microsoft.com/playwright:v1.62.1-jammy AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=prisma-cli /cli/node_modules /opt/prisma-cli/node_modules
COPY --from=builder /app/scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh \
  && mkdir -p /app/.next/cache \
  && chown -R pwuser:pwuser /app /opt/prisma-cli

USER pwuser
EXPOSE 8080

CMD ["./scripts/start.sh"]
