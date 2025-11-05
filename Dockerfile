# Multi-stage Dockerfile for LETS-GET-A-JOB
# Runs both Next.js app and n8n in a single container with supervisor

# Stage 1: Build Next.js application
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies) for building
RUN npm ci

# Copy application code
COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Production image
FROM node:20-bullseye AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-xetex \
    latexmk \
    make \
    sqlite3 \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built Next.js application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy application code (excluding node_modules which we already installed)
COPY . .

# Install n8n globally
RUN npm install -g n8n@latest

# Create necessary directories
RUN mkdir -p /app/data \
    /app/n8n-data \
    /app/logs \
    /root/.n8n

# Copy n8n workflows
COPY n8n-workflows/*.json /app/n8n-workflows/

# Copy setup script
COPY setup-n8n.sh /app/setup-n8n.sh
RUN chmod +x /app/setup-n8n.sh

# Create supervisord configuration without authentication
RUN cat > /etc/supervisor/conf.d/supervisord.conf << 'EOF'
[supervisord]
nodaemon=true
logfile=/app/logs/supervisord.log
pidfile=/var/run/supervisord.pid
user=root

[program:n8n]
command=n8n start
directory=/app
autostart=true
autorestart=true
stdout_logfile=/app/logs/n8n.log
stderr_logfile=/app/logs/n8n-error.log
environment=N8N_PORT="5678",N8N_HOST="0.0.0.0",N8N_PROTOCOL="http",N8N_PATH="/",N8N_PUSH_BACKEND="websocket",N8N_USER_FOLDER="/app/n8n-data",N8N_ENCRYPTION_KEY="random-encryption-key",N8N_USER_MANAGEMENT_DISABLED="true",N8N_DIAGNOSTICS_ENABLED="false",N8N_PERSONALIZATION_ENABLED="false",N8N_HIRING_BANNER_ENABLED="false",EXECUTIONS_DATA_SAVE_ON_ERROR="all",EXECUTIONS_DATA_SAVE_ON_SUCCESS="all",EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS="true",WEBHOOK_URL="http://localhost:5678"
priority=100

[program:workflow-setup]
command=/app/setup-n8n.sh
directory=/app
autostart=true
autorestart=false
startsecs=0
stdout_logfile=/app/logs/workflow-setup.log
stderr_logfile=/app/logs/workflow-setup-error.log
environment=N8N_USER_FOLDER="/app/n8n-data",GROQ_API_KEY="%(ENV_GROQ_API_KEY)s"
priority=200

[program:nextjs]
command=npm start
directory=/app
autostart=true
autorestart=true
stdout_logfile=/app/logs/nextjs.log
stderr_logfile=/app/logs/nextjs-error.log
environment=NODE_ENV="production",PORT="3000",NEXT_PUBLIC_N8N_JD_WEBHOOK_URL="http://localhost:5678/webhook/process-jd",NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL="http://localhost:5678/webhook/process-resume",NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL="http://localhost:5678/webhook/process-cover-letter",NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL="http://localhost:5678/webhook/evaluate-ats"
priority=300
EOF

# Expose ports
EXPOSE 3000 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    N8N_PORT=5678 \
    N8N_HOST=0.0.0.0 \
    N8N_USER_FOLDER=/app/n8n-data \
    NEXT_PUBLIC_N8N_JD_WEBHOOK_URL=http://localhost:5678/webhook/process-jd \
    NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL=http://localhost:5678/webhook/process-resume \
    NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL=http://localhost:5678/webhook/process-cover-letter \
    NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL=http://localhost:5678/webhook/evaluate-ats

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

