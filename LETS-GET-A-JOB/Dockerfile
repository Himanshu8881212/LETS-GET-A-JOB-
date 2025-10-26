# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    # LaTeX dependencies for PDF generation
    texlive \
    texlive-xetex \
    texlive-luatex \
    texmf-dist \
    fontconfig \
    # Additional utilities
    curl \
    bash

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install LaTeX and runtime dependencies
RUN apk add --no-cache \
    texlive \
    texlive-xetex \
    texlive-luatex \
    texmf-dist \
    fontconfig \
    bash \
    curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy LaTeX templates and data files
COPY --from=builder /app/resume ./resume
COPY --from=builder /app/cover_letter ./cover_letter
COPY --from=builder /app/common ./common
COPY --from=builder /app/RESUME_DATA.tex ./RESUME_DATA.tex
COPY --from=builder /app/COVER_LETTER_DATA.tex ./COVER_LETTER_DATA.tex

# Create data directories
RUN mkdir -p /app/data/documents /app/data/pdf-cache
RUN chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

