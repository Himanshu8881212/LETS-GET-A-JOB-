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
# Full texlive installation to ensure all required packages are available
RUN apk add --no-cache \
    texlive-full \
    fontconfig \
    bash \
    curl \
    make

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy LaTeX templates and data files
COPY --from=builder /app/resume ./resume
COPY --from=builder /app/cover_letter ./cover_letter
COPY --from=builder /app/common ./common
COPY --from=builder /app/Makefile ./Makefile
COPY --from=builder /app/RESUME_DATA.tex ./RESUME_DATA.tex
COPY --from=builder /app/COVER_LETTER_DATA.tex ./COVER_LETTER_DATA.tex

# Copy database schema and migrations directly from source
COPY lib/db ./lib/db

# Create data directories with proper permissions
# Make resume and cover_letter directories writable for PDF generation
# Make root /app directory writable for LaTeX data files (RESUME_DATA.tex, COVER_LETTER_DATA.tex)
RUN mkdir -p /app/data/documents /app/data/pdf-cache && \
    chown -R nextjs:nodejs /app/data && \
    chmod -R 755 /app/data && \
    chown -R nextjs:nodejs /app/resume /app/cover_letter && \
    chmod -R 755 /app/resume /app/cover_letter && \
    chown nextjs:nodejs /app && \
    chmod 755 /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start server (migrations run automatically on first database connection)
CMD ["node", "server.js"]

