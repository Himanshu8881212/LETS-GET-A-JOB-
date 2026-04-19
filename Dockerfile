# ──────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Toolchain for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./

# Skip Puppeteer's bundled Chromium download during install; we use the
# system chromium package in the runner stage below (smaller image,
# avoids musl/glibc ABI mismatches with Puppeteer's bundled build).
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci

# ──────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# ──────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────
# Stage 3: Runner
# ──────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Runtime deps:
#   - curl, bash       — healthchecks + shell ergonomics
#   - chromium + libs  — Puppeteer uses this for PDF rendering + URL fetching
#   - fonts            — Latin + Noto fallback so PDFs don't render with
#                        square replacement glyphs
RUN apk add --no-cache \
    curl \
    bash \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/app ./app
COPY --from=builder /app/.env.example ./.env.example

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
