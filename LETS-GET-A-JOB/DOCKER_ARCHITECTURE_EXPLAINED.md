# 🐳 Docker Architecture - Complete Explanation

## 📦 **Container Architecture**

### **Answer to Your Questions:**

#### **Q1: Are SQLite, LaTeX, n8n, and the application in one Docker container?**

**NO** - They are split across **2 separate containers**:

---

### **Container 1: `lets-get-a-job-app`** (Main Application)
**Image:** Custom-built from `Dockerfile`  
**Port:** 3000  
**Contains:**
- ✅ **Next.js Application** - The web application
- ✅ **SQLite Database** - Stored in `/app/data/app.db` (persisted via Docker volume)
- ✅ **LaTeX (texlive-full)** - For PDF generation
- ✅ **Make** - For running LaTeX compilation
- ✅ **Node.js Runtime** - For running the application

**What it does:**
- Serves the web application on port 3000
- Generates resume and cover letter PDFs using LaTeX
- Stores all user data in SQLite database
- Handles all business logic

---

### **Container 2: `lets-get-a-job-n8n`** (Automation Engine)
**Image:** `n8nio/n8n:latest` (official n8n image)  
**Port:** 5678  
**Contains:**
- ✅ **n8n Workflow Automation** - AI-powered workflow engine
- ✅ **SQLite Database** - For n8n's own data (separate from app database)
- ✅ **Workflow Files** - Imported from `/workflows` directory

**What it does:**
- Runs AI workflows for ATS evaluation
- Processes job descriptions
- Analyzes resumes and cover letters
- Provides AI-powered feedback

---

#### **Q2: Are they all in the compose file?**

**YES** - Both containers are defined in `docker-compose.yml`:

```yaml
services:
  # Container 1: n8n (lines 3-106)
  n8n:
    image: n8nio/n8n:latest
    container_name: lets-get-a-job-n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n-workflows:/workflows:ro
    
  # Container 2: Application (lines 108-138)
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: lets-get-a-job-app
    ports:
      - "3000:3000"
    volumes:
      - app_data:/app/data
```

---

## 🔄 **How They Work Together**

### **Communication:**
- Both containers are on the same Docker network: `app-network`
- The app container calls n8n webhooks via: `http://n8n:5678/webhook/...`
- n8n processes AI requests and returns results to the app

### **Data Persistence:**
- **`app_data` volume** - Stores SQLite database, generated PDFs, LaTeX files
- **`n8n_data` volume** - Stores n8n workflows, credentials, execution history

---

## 🚀 **Auto-Activation of n8n Workflows**

### **What I Fixed:**

Previously, n8n workflows were imported but **NOT activated automatically**. This meant the AI ATS Evaluator would fail with a 404 error.

### **New Solution:**

Updated `docker-compose.yml` to automatically:
1. ✅ **Import workflows** from `/workflows` directory on startup
2. ✅ **Activate all workflows** using n8n's REST API
3. ✅ **Verify activation** by checking workflow status

### **How It Works:**

```bash
# On container startup:
1. Start n8n in background
2. Wait for n8n to be ready (health check)
3. Import workflow files from /workflows/*.json
4. Use n8n API to activate each workflow
5. Workflows are now ready to receive webhook calls
```

### **Workflow Files:**
- `job-desc.json` - Processes job descriptions (webhook: `/webhook/process-jd`)
- `resume.json` - Analyzes resumes (webhook: `/webhook/process-resume`)
- `cover-letter.json` - Analyzes cover letters (webhook: `/webhook/process-cover-letter`)
- `eval.json` - Evaluates ATS compatibility (webhook: `/webhook/evaluate-ats`)

---

## ✅ **Out-of-the-Box Experience**

### **What Users Need to Do:**

```bash
# That's it! Just one command:
docker-compose up -d
```

### **What Happens Automatically:**

1. ✅ **Builds application container** with LaTeX, SQLite, Node.js
2. ✅ **Pulls n8n container** from Docker Hub
3. ✅ **Creates Docker volumes** for data persistence
4. ✅ **Creates Docker network** for inter-container communication
5. ✅ **Starts n8n** and waits for it to be healthy
6. ✅ **Imports n8n workflows** from `/workflows` directory
7. ✅ **Activates all workflows** automatically
8. ✅ **Starts application** once n8n is ready
9. ✅ **Initializes SQLite database** with schema
10. ✅ **Application is ready** at http://localhost:3000
11. ✅ **n8n is ready** at http://localhost:5678 (optional access)

### **No Manual Steps Required!**

- ❌ No need to manually import workflows
- ❌ No need to manually activate workflows
- ❌ No need to configure database
- ❌ No need to install LaTeX
- ❌ No need to set up environment variables

**Everything works out of the box!** 🎉

---

## 📊 **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │  Container 1: App    │      │  Container 2: n8n    │   │
│  │  ─────────────────   │      │  ─────────────────   │   │
│  │  • Next.js           │◄────►│  • n8n Workflows     │   │
│  │  • SQLite (app.db)   │      │  • SQLite (n8n.db)   │   │
│  │  • LaTeX/Make        │      │  • AI Processing     │   │
│  │  • Port 3000         │      │  • Port 5678         │   │
│  │                      │      │                      │   │
│  │  Volume: app_data    │      │  Volume: n8n_data    │   │
│  └──────────────────────┘      └──────────────────────┘   │
│           │                              │                 │
│           └──────────────────────────────┘                 │
│                  app-network                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   User's Browser     │
              │  localhost:3000      │
              └──────────────────────┘
```

---

## 🔧 **Technical Details**

### **Container 1 (App) - Dockerfile:**
```dockerfile
# Multi-stage build
FROM node:20-alpine AS base
FROM base AS deps
FROM base AS builder
FROM base AS runner

# Install LaTeX and runtime dependencies
RUN apk add --no-cache \
    texlive-full \
    fontconfig \
    bash \
    curl \
    make

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy application files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/resume ./resume
COPY --from=builder /app/cover_letter ./cover_letter

# Set permissions
RUN mkdir -p /app/data/documents /app/data/pdf-cache && \
    chown -R nextjs:nodejs /app/data && \
    chown -R nextjs:nodejs /app/resume /app/cover_letter

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### **Container 2 (n8n) - docker-compose.yml:**
```yaml
n8n:
  image: n8nio/n8n:latest
  environment:
    - N8N_USER_MANAGEMENT_DISABLED=true
    - N8N_COMMUNITY_PACKAGES_ENABLED=true
    - DB_TYPE=sqlite
  volumes:
    - n8n_data:/home/node/.n8n
    - ./n8n-workflows:/workflows:ro
  command:
    - |
      # Start n8n
      n8n start &
      
      # Wait for n8n to be ready
      # Import workflows
      # Activate workflows using API
      
      # Keep running
      wait $N8N_PID
```

---

## 🎯 **Summary**

### **Container Architecture:**
- **2 separate containers** (app + n8n)
- **2 separate SQLite databases** (one per container)
- **1 shared Docker network** (for communication)
- **2 Docker volumes** (for data persistence)

### **What's Included:**
- ✅ Next.js application with SQLite
- ✅ LaTeX for PDF generation
- ✅ n8n for AI workflows
- ✅ Automatic workflow import and activation
- ✅ Data persistence across restarts

### **User Experience:**
```bash
docker-compose up -d
# Wait 30 seconds
# Open http://localhost:3000
# Everything works! 🎉
```

**No manual configuration required!** 🚀

---

## 📝 **Files Changed**

### **docker-compose.yml**
- Added automatic workflow import and activation
- Uses n8n REST API to activate workflows
- Ensures workflows are ready before app starts

### **Workflow Files** (in `/n8n-workflows/`)
- `job-desc.json` - Already has `"active":1`
- `resume.json` - Already has `"active":1`
- `cover-letter.json` - Already has `"active":1`
- `eval.json` - Already has `"active":1`

All workflows are now automatically activated on startup!

---

**Everything is ready for smooth sailing! ⛵**

