# Production Setup Guide - LETS-GET-A-JOB

## 🚀 Quick Start (3 Steps)

### 1. Set up Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:
```env
GROQ_API_KEY=your-actual-groq-api-key-here
```

**Get your Groq API key:** https://console.groq.com/keys

### 2. Start the Application

```bash
docker-compose up -d
```

### 3. Verify Setup

Wait 60-90 seconds for initialization, then check:

```bash
# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3000/api/health

# Test n8n
curl http://localhost:5678/healthz
```

---

## 📋 What Happens on Startup?

The application automatically performs these initialization steps:

### 1. **Database Initialization** (Priority 10)
   - Creates SQLite database if missing
   - Applies base schema with all tables
   - Runs migrations in correct dependency order
   - Verifies all critical tables exist

**Critical Tables Created:**
- `users`
- `job_applications`
- `resume_versions`
- `cover_letter_versions`
- `ats_evaluations` ← (Fixed: no more 500 errors!)
- `activity_logs`
- `job_status_history`

### 2. **n8n Service** (Priority 100)
   - Starts n8n workflow engine
   - Creates database and initial config
   - Waits for full initialization

### 3. **Workflow Setup** (Priority 200)
   - Auto-creates Groq credentials from `GROQ_API_KEY`
   - Updates workflow files with correct credential IDs
   - Imports all 4 workflows
   - Activates workflows automatically

**Workflows Imported:**
- Job Description Processing
- Resume Processing
- Cover Letter Processing
- ATS Evaluation

### 4. **Next.js Application** (Priority 300)
   - Starts web application
   - Connects to database
   - Ready to serve requests

---

## ✅ Verification Checklist

After startup, verify everything is working:

### Check Services are Running
```bash
docker ps
# Should show: lets-get-a-job-all-in-one (healthy)
```

### Check Initialization Logs
```bash
# Database initialization
docker exec lets-get-a-job-all-in-one cat /app/logs/database-init.log

# n8n workflow setup
docker exec lets-get-a-job-all-in-one cat /app/logs/workflow-setup.log
```

### Verify Database Tables
```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/data/app.db ".tables"
```

**Expected output:**
```
activity_logs          job_applications       resume_versions      
ats_evaluations        job_status_history     schema_migrations    
cover_letter_versions  
```

### Verify n8n Workflows
```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/.n8n/database.sqlite \
  "SELECT id, name, active FROM workflow_entity;"
```

**Expected output:**
```
SqEpggb00rB45hfY|Cover Letter|1
pyGw8Xkfa9DkwfLI|Eval|1
ucYm8rg6b0w95u7o|Job Desc|1
FhstFikYbdPmaMGf|Resume|1
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# ATS Evaluation (with sample data)
curl -X POST http://localhost:3000/api/n8n/evaluate-ats \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text":"Software Engineer with 5 years Python",
    "cover_letter_text":"Excited to apply",
    "job_description":"Looking for Python developer"
  }'
```

---

## 🔧 Troubleshooting

### Issue: "No GROQ_API_KEY environment variable set"

**Solution:** Add your Groq API key to `.env` file and restart:
```bash
docker-compose down
docker-compose up -d
```

### Issue: "Workflows not activated"

**Check workflow setup log:**
```bash
docker exec lets-get-a-job-all-in-one cat /app/logs/workflow-setup.log
```

**Manual activation:**
```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/.n8n/database.sqlite \
  "UPDATE workflow_entity SET active = 1;"

docker restart lets-get-a-job-all-in-one
```

### Issue: "ats_evaluations table missing"

**Check database initialization:**
```bash
docker exec lets-get-a-job-all-in-one cat /app/logs/database-init.log
```

**Manual table creation:**
```bash
docker exec lets-get-a-job-all-in-one /app/init-database.sh
```

### Issue: "500 Internal Server Error on evaluation save"

This was caused by missing `ats_evaluations` table. It's now fixed with the database initialization script.

**Verify table exists:**
```bash
docker exec lets-get-a-job-all-in-one sqlite3 /app/data/app.db \
  "SELECT name FROM sqlite_master WHERE type='table' AND name='ats_evaluations';"
```

---

## 🔄 Clean Restart (Fresh Installation)

To completely reset and start fresh:

```bash
# Stop and remove everything
docker-compose down -v

# Remove local data (optional)
rm -rf data/ .next/

# Start fresh
docker-compose up -d --build
```

---

## 📊 Production Monitoring

### View Live Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker exec lets-get-a-job-all-in-one tail -f /app/logs/nextjs.log
docker exec lets-get-a-job-all-in-one tail -f /app/logs/n8n.log
```

### Check Resource Usage
```bash
docker stats lets-get-a-job-all-in-one
```

### Database Size
```bash
docker exec lets-get-a-job-all-in-one du -h /app/data/app.db
```

---

## 🎯 Success Criteria

Your production deployment is ready when:

- ✅ Container is healthy: `docker ps` shows "healthy" status
- ✅ All 8 tables exist in database
- ✅ All 4 n8n workflows are active
- ✅ Health endpoint returns 200 OK
- ✅ ATS evaluation endpoint returns valid JSON
- ✅ No errors in logs

**You're all set! 🎉**
