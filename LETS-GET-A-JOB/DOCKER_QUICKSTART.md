# 🚀 Docker Quick Start - LETS-GET-A-JOB

Get the entire application running in **3 simple steps**!

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Install Docker

Download and install Docker Desktop:
- **macOS**: https://docs.docker.com/desktop/install/mac-install/
- **Windows**: https://docs.docker.com/desktop/install/windows-install/
- **Linux**: https://docs.docker.com/desktop/install/linux-install/

### 2️⃣ Clone and Navigate

```bash
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-/LETS-GET-A-JOB
```

### 3️⃣ Start Everything

```bash
docker-compose up -d
```

**That's it!** 🎉

---

## 🌐 Access Your Application

After starting (wait ~60 seconds for initialization):

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | http://localhost:3000 | Resume Builder, Job Tracker, AI ATS Evaluator |
| **n8n Dashboard** | http://localhost:5678 | Workflow automation dashboard |

---

## ✅ Verify It's Working

```bash
# Check service status
docker-compose ps

# Check health
curl http://localhost:3000/api/health
curl http://localhost:5678/healthz
```

Expected output:
```
✅ Both services should show "healthy" status
✅ Health endpoints should return 200 OK
```

---

## 🛠️ Common Commands

### Using the Management Script

```bash
# Make script executable (first time only)
chmod +x docker-manage.sh

# Start services
./docker-manage.sh start

# Stop services
./docker-manage.sh stop

# View logs
./docker-manage.sh logs

# Check health
./docker-manage.sh health

# See all commands
./docker-manage.sh help
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build
```

---

## 📊 What's Included?

Your Docker setup includes:

✅ **Next.js Application** (Port 3000)
- Resume and Cover Letter Builder
- Job Application Tracker
- AI ATS Evaluator
- SQLite database

✅ **n8n Workflow Automation** (Port 5678)
- 4 Pre-configured AI workflows:
  - Job Description Processing
  - Resume Processing
  - Cover Letter Processing
  - ATS Evaluation

✅ **Persistent Data**
- All your data is saved in Docker volumes
- Survives container restarts
- Can be backed up and restored

---

## 🎯 First Steps After Starting

1. **Open the application**: http://localhost:3000

2. **Build your first resume**:
   - Click "Resume Builder"
   - Fill in your information
   - Download as PDF

3. **Track a job application**:
   - Click "Job Tracker"
   - Add a new job
   - Track your progress

4. **Try the AI ATS Evaluator**:
   - Click "AI ATS Evaluator"
   - Upload your resume and cover letter
   - Paste a job description
   - Get AI-powered feedback

5. **Check n8n workflows**: http://localhost:5678
   - View the 4 pre-configured workflows
   - See execution history
   - Monitor AI processing

---

## 🔧 Troubleshooting

### Services won't start?

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :3000
lsof -i :5678

# View detailed logs
docker-compose logs
```

### Can't access the application?

```bash
# Wait for services to be healthy (can take 60 seconds)
docker-compose ps

# Check health
./docker-manage.sh health

# View logs
./docker-manage.sh logs
```

### Need to reset everything?

```bash
# Stop and remove everything (including data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## 💾 Backup Your Data

```bash
# Create backup
./docker-manage.sh backup

# Backups are saved in ./backups/ directory
```

---

## 📚 Full Documentation

For detailed documentation, see:
- **[DOCKER_README.md](DOCKER_README.md)** - Complete Docker guide
- **[README.md](README.md)** - Application documentation

---

## 🆘 Need Help?

1. Check logs: `./docker-manage.sh logs`
2. Check health: `./docker-manage.sh health`
3. View status: `./docker-manage.sh status`
4. See all commands: `./docker-manage.sh help`

---

## 🎉 You're All Set!

Your complete job application system is now running!

**Next Steps:**
1. Build your resume
2. Track your applications
3. Get AI-powered feedback
4. Land your dream job! 🚀

---

**Happy Job Hunting!** 🎯

