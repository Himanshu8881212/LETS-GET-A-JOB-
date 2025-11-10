# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
# - python3, make, g++: Required to compile better-sqlite3 (includes SQLite)
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Install required system dependencies
# - curl: for healthchecks
# - bash: for entrypoint script
# - texlive-full: Complete LaTeX distribution for PDF generation (includes pdflatex and all packages)
RUN apk add --no-cache \
    curl \
    bash \
    texlive-full

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy necessary files for runtime
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/app ./app
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/n8n-workflows ./n8n-workflows
COPY --from=builder /app/setup-n8n-workflows.js ./setup-n8n-workflows.js

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
