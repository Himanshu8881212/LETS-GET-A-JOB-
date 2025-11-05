# Docker Setup Guide

This document provides detailed information about the Docker setup for LETS-GET-A-JOB.

## Architecture

The application uses a **single-container architecture** that runs:
- Next.js application (port 3000)
- n8n workflow engine (port 5678)
- SQLite databases (app + n8n)
- LaTeX/TeX Live for PDF generation
- Supervisor for process management

## Quick Start

### Option 1: Using the Start Script (Recommended)

```bash
./start.sh
```

This interactive script will:
- Check Docker installation
- Build and start the container
- Display access URLs and credentials
- Provide helpful commands

### Option 2: Using Docker Compose Directly

```bash
# Build and start
docker-compose up -d --build

# View logs
docker logs -f lets-get-a-job-all-in-one

# Stop
docker-compose down
```

## Container Details

### Services Running Inside Container

The container runs 4 processes managed by Supervisor:

1. **n8n** (Priority 100)
   - Starts first
   - Runs on port 5678
   - Stores data in `/app/n8n-data`

2. **workflow-import** (Priority 200)
   - Runs after n8n starts
   - Imports all 4 workflows from `/app/n8n-workflows/`
   - Activates workflows automatically
   - Runs once and exits

3. **user-creation** (Priority 300)
   - Creates default n8n user
   - Email: admin@localhost
   - Password: admin123
   - Runs once and exits

4. **nextjs** (Priority 400)
   - Starts last
   - Runs on port 3000
   - Serves the main application

### Volumes

Three Docker volumes persist data:

- `app_data` - Application database, PDFs, documents
- `n8n_data` - n8n workflows and execution history
- `logs` - Application and service logs

## n8n Workflows

The container automatically imports and activates 4 workflows:

1. **job-desc.json** - Job description parser
   - Webhook: `/webhook/process-jd`
   
2. **resume.json** - Resume analyzer
   - Webhook: `/webhook/process-resume`
   
3. **cover-letter.json** - Cover letter analyzer
   - Webhook: `/webhook/process-cover-letter`
   
4. **eval.json** - ATS evaluation
   - Webhook: `/webhook/evaluate-ats`

### Workflow Activation

Workflows are automatically activated on first startup. To verify:

```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/database.sqlite \
  "SELECT name, active FROM workflow_entity;"
```

Expected output:
```
cover-letter|1
eval|1
job-desc|1
resume|1
```

## Testing the Setup

### 1. Check Container Status

```bash
docker ps | grep lets-get-a-job
```

Should show the container running with ports 3000 and 5678 exposed.

### 2. Check Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Should return a success response.

### 3. Check n8n

```bash
curl http://localhost:5678/healthz
```

Should return `{"status":"ok"}`.

### 4. Test Workflows

```bash
# Test job description processing
curl -X POST http://localhost:5678/webhook/process-jd \
  -H "Content-Type: application/json" \
  -d '{"jobUrl":"https://example.com/job"}'

# Should return JSON (not 404)
```

### 5. Check Logs

```bash
# All logs
docker logs lets-get-a-job-all-in-one

# Just n8n logs
docker exec lets-get-a-job-all-in-one cat /app/logs/n8n.log

# Just Next.js logs
docker exec lets-get-a-job-all-in-one cat /app/logs/nextjs.log

# Workflow import logs
docker exec lets-get-a-job-all-in-one cat /app/logs/workflow-import.log
```

## Troubleshooting

### Container Won't Start

```bash
# Check build logs
docker-compose up --build

# Check container logs
docker logs lets-get-a-job-all-in-one
```

### Workflows Not Working

1. Check if workflows are active:
```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/database.sqlite \
  "SELECT name, active FROM workflow_entity;"
```

2. Manually activate in n8n UI:
   - Open http://localhost:5678
   - Login with admin@localhost / admin123
   - Go to Workflows
   - Toggle each workflow to Active

### Port Conflicts

If ports 3000 or 5678 are in use, edit `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change external port
  - "5679:5678"  # Change external port
```

### Reset Everything

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Remove all Docker data
docker system prune -af --volumes

# Rebuild
docker-compose up -d --build
```

## Environment Variables

Key environment variables (set in docker-compose.yml):

```yaml
# Application
NODE_ENV=production
PORT=3000

# n8n
N8N_PORT=5678
N8N_HOST=0.0.0.0
N8N_USER_FOLDER=/app/n8n-data

# Webhooks (for Next.js client)
NEXT_PUBLIC_N8N_JD_WEBHOOK_URL=http://localhost:5678/webhook/process-jd
NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL=http://localhost:5678/webhook/process-resume
NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL=http://localhost:5678/webhook/process-cover-letter
NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL=http://localhost:5678/webhook/evaluate-ats
```

## Production Deployment

For production, update these settings:

1. **Change default credentials** in Dockerfile:
   - Update n8n user creation script
   - Use strong passwords

2. **Update encryption keys**:
   - `N8N_ENCRYPTION_KEY`
   - `N8N_USER_MANAGEMENT_JWT_SECRET`

3. **Configure firewall**:
   - Restrict access to port 5678
   - Only expose port 3000 publicly

4. **Use HTTPS**:
   - Add reverse proxy (nginx/traefik)
   - Configure SSL certificates

5. **Backup volumes regularly**:
```bash
docker run --rm -v lets-get-a-job_app_data:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/app_data_backup.tar.gz -C /data .
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### View Resource Usage

```bash
docker stats lets-get-a-job-all-in-one
```

### Access Container Shell

```bash
docker exec -it lets-get-a-job-all-in-one bash
```

### Check Supervisor Status

```bash
docker exec lets-get-a-job-all-in-one supervisorctl status
```

Expected output:
```
n8n                              RUNNING   pid 123, uptime 0:05:00
nextjs                           RUNNING   pid 456, uptime 0:04:30
user-creation                    EXITED    Nov 04 12:00 PM
workflow-import                  EXITED    Nov 04 12:00 PM
```

