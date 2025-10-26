# 🐳 Docker Deployment Guide - LETS-GET-A-JOB

Complete Docker setup for deploying the entire LETS-GET-A-JOB application as a single, self-contained unit.

---

## 📦 What's Included

This Docker setup packages:

1. **Next.js Application** (Port 3000)
   - Resume and Cover Letter Builder
   - Job Application Tracker
   - AI ATS Evaluator
   - SQLite database for data persistence

2. **n8n Workflow Automation** (Port 5678)
   - Pre-configured with 4 AI workflows:
     - Job Description Processing
     - Resume Processing
     - Cover Letter Processing
     - ATS Evaluation
   - SQLite database for workflow persistence

3. **Persistent Data Volumes**
   - Application data (resumes, cover letters, job applications)
   - n8n workflows and execution history

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- At least 4GB of available RAM
- At least 2GB of free disk space

### 1. Clone the Repository

```bash
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-/LETS-GET-A-JOB
```

### 2. Start the Application

```bash
docker-compose up -d
```

This single command will:
- Build the Next.js application
- Pull the n8n image
- Create Docker networks and volumes
- Start both services
- Import the 4 pre-configured n8n workflows
- Activate all workflows automatically

### 3. Access the Application

**Main Application:**
- URL: http://localhost:3000
- Features: Resume Builder, Job Tracker, AI ATS Evaluator

**n8n Dashboard:**
- URL: http://localhost:5678
- View and manage workflows
- Monitor execution history

### 4. Verify Everything is Running

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f app
docker-compose logs -f n8n
```

---

## 📊 Service Health Checks

Both services include health checks:

```bash
# Check Next.js app health
curl http://localhost:3000/api/health

# Check n8n health
curl http://localhost:5678/healthz
```

Expected responses:
- Next.js: `{"status":"ok","timestamp":"...","service":"lets-get-a-job"}`
- n8n: `{"status":"ok"}`

---

## 🔧 Configuration

### Environment Variables

The application uses `.env.docker` for configuration. Key variables:

```bash
# n8n Webhook URLs (internal Docker network)
NEXT_PUBLIC_N8N_JD_WEBHOOK_URL=http://n8n:5678/webhook/process-jd
NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL=http://n8n:5678/webhook/process-resume
NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL=http://n8n:5678/webhook/process-cover-letter
NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL=http://n8n:5678/webhook/evaluate-ats

# Timeout (2 minutes)
NEXT_PUBLIC_N8N_TIMEOUT=120000
```

### Customizing Configuration

1. Copy the template:
   ```bash
   cp .env.docker .env.docker.local
   ```

2. Edit `.env.docker.local` with your settings

3. Update `docker-compose.yml` to use the new file:
   ```yaml
   env_file:
     - .env.docker.local
   ```

4. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## 🛠️ Common Operations

### Stop the Application

```bash
# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down
```

### Restart the Application

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart n8n
```

### View Logs

```bash
# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f app
docker-compose logs -f n8n
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force rebuild (no cache)
docker-compose build --no-cache
docker-compose up -d
```

---

## 💾 Data Management

### Backup Data

```bash
# Create backup directory
mkdir -p backups

# Backup application data
docker run --rm -v lets-get-a-job_app_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/app-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Backup n8n data
docker run --rm -v lets-get-a-job_n8n_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/n8n-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore Data

```bash
# Stop services first
docker-compose down

# Restore application data
docker run --rm -v lets-get-a-job_app_data:/data -v $(pwd)/backups:/backup alpine sh -c "cd /data && tar xzf /backup/app-data-YYYYMMDD-HHMMSS.tar.gz"

# Restore n8n data
docker run --rm -v lets-get-a-job_n8n_data:/data -v $(pwd)/backups:/backup alpine sh -c "cd /data && tar xzf /backup/n8n-data-YYYYMMDD-HHMMSS.tar.gz"

# Start services
docker-compose up -d
```

### Reset Everything (Fresh Start)

```bash
# WARNING: This deletes ALL data!
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :3000
lsof -i :5678

# View detailed logs
docker-compose logs
```

### n8n Workflows Not Imported

```bash
# Check if workflows exist
docker-compose exec n8n ls -la /workflows/

# Manually import workflows
docker-compose exec n8n n8n import:workflow --input=/workflows/job-desc.json
docker-compose exec n8n n8n import:workflow --input=/workflows/resume.json
docker-compose exec n8n n8n import:workflow --input=/workflows/cover-letter.json
docker-compose exec n8n n8n import:workflow --input=/workflows/eval.json
```

### Application Can't Connect to n8n

```bash
# Check network connectivity
docker-compose exec app ping -c 3 n8n

# Verify n8n is healthy
docker-compose exec n8n wget -O- http://localhost:5678/healthz

# Check environment variables
docker-compose exec app env | grep N8N
```

### Database Issues

```bash
# Access application database
docker-compose exec app sqlite3 /app/data/app.db

# Access n8n database
docker-compose exec n8n sqlite3 /home/node/.n8n/database.sqlite

# Check database integrity
docker-compose exec app sqlite3 /app/data/app.db "PRAGMA integrity_check;"
```

### Out of Memory

```bash
# Check Docker resource limits
docker stats

# Increase Docker Desktop memory:
# Docker Desktop → Settings → Resources → Memory → Increase to 4GB+
```

---

## 🌐 External Access

### Access from Other Devices on Your Network

1. Find your server's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `.env.docker` with your IP:
   ```bash
   NEXT_PUBLIC_N8N_JD_WEBHOOK_URL=http://YOUR_IP:5678/webhook/process-jd
   # ... update all webhook URLs
   ```

3. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. Access from other devices:
   - Application: `http://YOUR_IP:3000`
   - n8n: `http://YOUR_IP:5678`

### Deploy to Production Server

For production deployment, consider:

1. **Use a reverse proxy** (nginx, Traefik)
2. **Enable HTTPS** with Let's Encrypt
3. **Set up proper authentication** for n8n
4. **Configure firewall rules**
5. **Set up automated backups**
6. **Monitor resource usage**

---

## 📁 Volume Locations

Docker volumes store persistent data:

```bash
# List volumes
docker volume ls | grep lets-get-a-job

# Inspect volume
docker volume inspect lets-get-a-job_app_data
docker volume inspect lets-get-a-job_n8n_data

# Volume locations (Linux):
# /var/lib/docker/volumes/lets-get-a-job_app_data/_data
# /var/lib/docker/volumes/lets-get-a-job_n8n_data/_data

# Volume locations (macOS/Windows):
# Managed by Docker Desktop VM
```

---

## 🧪 Testing the Setup

### Test n8n Workflows

```bash
# Test Job Description Processing
curl -X POST http://localhost:5678/webhook/process-jd \
  -H "Content-Type: application/json" \
  -d '{"jobUrl":"https://www.linkedin.com/jobs/view/3901234567"}'

# Test ATS Evaluation
curl -X POST http://localhost:5678/webhook/evaluate-ats \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Software Engineer with 5 years of React experience",
    "cover_letter_text": "I am excited to apply for this position",
    "job_description": "Looking for a Software Engineer with React experience"
  }'
```

### Test Application Health

```bash
# Run the test script
docker-compose exec app sh -c "cd /app && ./scripts/test-webhooks.sh"
```

---

## 📝 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Host                              │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   Next.js App        │      │      n8n             │    │
│  │   Port: 3000         │◄────►│   Port: 5678         │    │
│  │                      │      │                      │    │
│  │  - Resume Builder    │      │  - Job Desc AI       │    │
│  │  - Job Tracker       │      │  - Resume AI         │    │
│  │  - ATS Evaluator     │      │  - Cover Letter AI   │    │
│  │                      │      │  - ATS Eval AI       │    │
│  └──────────┬───────────┘      └──────────┬───────────┘    │
│             │                              │                │
│             ▼                              ▼                │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   app_data volume    │      │  n8n_data volume     │    │
│  │   - app.db           │      │  - database.sqlite   │    │
│  │   - documents/       │      │  - workflows/        │    │
│  │   - pdf-cache/       │      │  - credentials/      │    │
│  └──────────────────────┘      └──────────────────────┘    │
│                                                              │
│             Docker Network: app-network                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. **Access the application** at http://localhost:3000
2. **Build your first resume** using the Resume Builder
3. **Track job applications** with the Job Tracker
4. **Evaluate your resume** with the AI ATS Evaluator
5. **Monitor workflows** in the n8n dashboard at http://localhost:5678

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. View logs: `docker-compose logs -f`
3. Verify health checks are passing
4. Ensure Docker has enough resources (4GB+ RAM)
5. Check for port conflicts (3000, 5678)

---

## 📄 License

This project is part of LETS-GET-A-JOB application.

---

**Happy Job Hunting! 🎯**

