# Multi-stage build for Next.js application with n8n
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

# Production image with Next.js + n8n + LaTeX + SQLite all in one container
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install ALL dependencies: LaTeX, n8n, SQLite, and runtime tools
RUN apk add --no-cache \
    texlive \
    texmf-dist \
    texmf-dist-latexextra \
    texmf-dist-fontsextra \
    fontconfig \
    bash \
    curl \
    make \
    wget \
    sqlite \
    py3-pip \
    && pip3 install supervisor --break-system-packages \
    && npm install -g n8n

# Create users
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

# Copy database schema and migrations directly from source
COPY lib/db ./lib/db

# Copy n8n workflows
COPY ./n8n-workflows /app/n8n-workflows

# Create data directories with proper permissions
RUN mkdir -p /app/data/documents /app/data/pdf-cache /app/n8n-data/.n8n && \
    chown -R nextjs:nodejs /app/data && \
    chmod -R 777 /app/data && \
    chown -R nextjs:nodejs /app/resume /app/cover_letter && \
    chmod -R 777 /app/resume /app/cover_letter && \
    chown -R nextjs:nodejs /app/n8n-data && \
    chmod -R 777 /app/n8n-data && \
    chown nextjs:nodejs /app && \
    chmod 777 /app

# Create supervisor config to run both Next.js and n8n
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:n8n]
command=/usr/local/bin/node /usr/local/lib/node_modules/n8n/bin/n8n start
directory=/app
user=nextjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=N8N_HOST="0.0.0.0",N8N_PORT="5678",N8N_PROTOCOL="http",WEBHOOK_URL="http://localhost:5678/",N8N_USER_MANAGEMENT_DISABLED="true",N8N_COMMUNITY_PACKAGES_ENABLED="true",DB_TYPE="sqlite",DB_SQLITE_DATABASE="/app/n8n-data/database.sqlite",N8N_USER_FOLDER="/app/n8n-data",EXECUTIONS_DATA_SAVE_ON_ERROR="all",EXECUTIONS_DATA_SAVE_ON_SUCCESS="all",N8N_LOG_LEVEL="info"

[program:nextjs]
command=/usr/local/bin/node /app/server.js
directory=/app
user=nextjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=PORT="3000",HOSTNAME="0.0.0.0",NODE_ENV="production",NEXT_PUBLIC_N8N_JD_WEBHOOK_URL="http://localhost:5678/webhook/process-jd",NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL="http://localhost:5678/webhook/process-resume",NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL="http://localhost:5678/webhook/process-cover-letter",NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL="http://localhost:5678/webhook/evaluate-ats"
EOF

# Create startup script to import and activate n8n workflows
COPY <<'EOF' /app/startup.sh
#!/bin/bash
set -e

echo "Starting services..."

# Start supervisor in background
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &

# Wait for n8n to be ready
echo "Waiting for n8n to start..."
for i in {1..60}; do
  if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
    echo "n8n is ready!"
    break
  fi
  echo "Waiting for n8n... ($i/60)"
  sleep 2
done

# Import and activate workflows using direct database insertion
if [ -d "/app/n8n-workflows" ]; then
  echo "Importing and activating n8n workflows..."

  # Wait for n8n to fully initialize its database
  echo "Waiting for n8n to create database..."
  for i in {1..60}; do
    # Check if database file exists and has content (size > 0)
    if [ -f "/app/n8n-data/database.sqlite" ] && [ -s "/app/n8n-data/database.sqlite" ]; then
      echo "n8n database file created!"
      # Wait a bit more for migrations to complete
      sleep 5
      # Now check if workflow_entity table exists
      if sqlite3 /app/n8n-data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_entity';" 2>/dev/null | grep -q workflow_entity; then
        echo "n8n database initialized!"
        break
      fi
    fi
    echo "Waiting for n8n database... ($i/60)"
    sleep 2
  done

  # Import each workflow by inserting directly into database
  for workflow_file in /app/n8n-workflows/*.json; do
    if [ -f "$workflow_file" ]; then
      WORKFLOW_NAME=$(basename "$workflow_file" .json)
      echo "Importing $WORKFLOW_NAME..."

      # Read workflow JSON and escape for SQL
      WORKFLOW_JSON=$(cat "$workflow_file" | sed "s/'/''/g")

      # Generate a unique ID (UUID format)
      WORKFLOW_ID=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 32 | head -n 1 | sed 's/\(.\{8\}\)\(.\{4\}\)\(.\{4\}\)\(.\{4\}\)\(.\{12\}\)/\1-\2-\3-\4-\5/')

      # Insert into database with active=1
      sqlite3 /app/n8n-data/database.sqlite "INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, pinData, versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt, isArchived) VALUES ('$WORKFLOW_ID', '$WORKFLOW_NAME', 1, json_extract('$WORKFLOW_JSON', '$.nodes'), json_extract('$WORKFLOW_JSON', '$.connections'), json_extract('$WORKFLOW_JSON', '$.settings'), '{}', '{}', NULL, 0, NULL, NULL, datetime('now'), datetime('now'), 0);" 2>&1 && echo "  ✓ Imported and activated $WORKFLOW_NAME" || echo "  ✗ Failed to import $WORKFLOW_NAME"
    fi
  done

  echo "Workflows imported and activated!"
fi

echo "All services started successfully!"

# Keep container running
wait
EOF

RUN chmod +x /app/startup.sh

EXPOSE 3000 5678

# Start both services using startup script
CMD ["/app/startup.sh"]
