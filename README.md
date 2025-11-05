# LETS GET A JOB!

**AI-Powered Resume & Cover Letter Builder with ATS Evaluation and Job Tracking**

A comprehensive Next.js application that helps you create ATS-compatible resumes and cover letters, evaluate them with AI, and track your job applications.

---

## 🐳 Docker Deployment (Recommended - Two Containers)

**Want everything in one package? Use Docker Compose!**

This setup uses **two containers**:
1. **n8n container** - Runs first so you can get your n8n API key
2. **Application container** - Runs after n8n is ready

### Prerequisites
1. **Docker** and **Docker Compose** installed
2. **API Keys** needed (get these first):
   - **Groq API Key**: https://console.groq.com/keys
   - **Tavily API Key**: https://tavily.com

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-

# 2. Start n8n container FIRST
docker-compose --profile n8n up -d

# 3. Wait 30 seconds, then open n8n
echo "Waiting for n8n to start..."
sleep 30
echo "n8n ready! Open http://localhost:5678"

# 4. Get your n8n API key:
#    a. Go to http://localhost:5678
#    b. Create an account (first time only)
#    c. Go to Settings → API
#    d. Click "Create an API key"
#    e. Copy the API key

# 5. Create .env file with ALL THREE API keys
cp .env.docker .env
# Edit .env and add:
#   - N8N_API_KEY (from step 4)
#   - GROQ_API_KEY
#   - TAVILY_API_KEY

# 6. Start the application container
docker-compose --profile app up -d

# That's it! Wait 30 seconds for workflows to setup
```

**Done!**
- Application: http://localhost:3000
- n8n: http://localhost:5678

**To stop everything:**
```bash
docker-compose --profile full down
```

**To view logs:**
```bash
# n8n logs
docker-compose logs -f n8n

# Application logs
docker-compose logs -f app
```

**To start everything together (if already configured):**
```bash
docker-compose --profile full up -d
```

---

## 🚀 Complete Fresh Start (New User)

**Starting completely fresh? Follow these steps:**

### Prerequisites

Before you begin, make sure you have:
1. **Docker** installed and running
2. **Node.js** 18+ installed
3. **Get your API keys** (both free):
   - **Groq API Key**: https://console.groq.com/keys
   - **Tavily API Key**: https://tavily.com

### Setup Commands

```bash
# 1. Clone the repository (if you haven't already)
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-

# 2. Clean up any existing setup (optional, if you had issues before)
docker stop n8n 2>/dev/null || true
docker rm n8n 2>/dev/null || true
rm -rf data/app.db* 2>/dev/null || true
rm -rf .next

# 3. Copy environment file
cp .env.example .env.local

# 4. Install dependencies
npm install

# 5. Start n8n in Docker (no authentication, port 5678)
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest

# 6. Wait 30 seconds for n8n to fully start
echo "Waiting 30 seconds for n8n to start..."
sleep 30

# 7. Setup n8n workflows (you'll be prompted for Groq and Tavily API keys)
node setup-n8n-workflows.js

# 8. Start the application
npm run dev
```

**Done!** Open http://localhost:3000 in your browser.

---

## From Scratch Setup (TL;DR)

**Prerequisites:** Get your API keys first:
- Groq: https://console.groq.com/keys
- Tavily: https://tavily.com

```bash
# 1. Start n8n in Docker (port 5678, no auth)
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest

# 2. Wait 30 seconds, then setup workflows (you'll be prompted for API keys)
sleep 30
node setup-n8n-workflows.js

# 3. Install dependencies and run
npm install
npm run dev
```

Done! Open http://localhost:3000

---

## Quick Start Guide

Follow these steps to set up and run the application:

### 1. Install n8n in Docker (No Authentication Required)

Install n8n with authentication disabled for easy local development:

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -e N8N_USER_MANAGEMENT_DISABLED=true \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest
```

Wait for n8n to start (about 30 seconds). That's it! No manual setup needed.

**Note:** If you already have n8n running with authentication enabled, you can restart it with:
```bash
docker stop n8n && docker rm n8n
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest
```

### 2. Setup n8n Workflows (Automated)

**Get your API keys first:**
- **Groq API Key**: https://console.groq.com/keys
- **Tavily API Key**: https://tavily.com

Run the automated setup script:

```bash
node setup-n8n-workflows.js
```

The script will prompt you for both API keys, then automatically:
- Create Groq credentials in n8n
- Import all 4 workflows
- Configure Groq credentials and Tavily API key in workflows
- Activate workflows in **production mode** (this fixes the 404/500 errors!)
- Configure webhooks to work with your .env.local

### 3. Install Dependencies and Run the Application

```bash
npm install
npm run dev
```

The application will start at http://localhost:3000

---

## That's It!

Everything should work fine now. You can:

- Create resumes and cover letters
- Evaluate them with AI
- Track your job applications
- Generate professional PDFs

---

## Features

### Resume Builder
- Professional LaTeX Templates for ATS-compatible PDFs
- Version Control with semantic versioning
- Live Preview
- Dynamic Sections

### Cover Letter Builder
- Customizable Templates
- Version Control
- Company-Specific customization

### AI ATS Evaluator
- AI-Powered Analysis
- ATS Compatibility Score
- Improvement Suggestions
- Job Description Parsing

### Job Tracker
- Kanban Board (Applied → Interview → Offer → Rejected)
- Application History
- Document Linking
- Analytics

---

## Environment Configuration

The application uses environment variables defined in `.env.local`:

- `NEXT_PUBLIC_N8N_JD_WEBHOOK_URL` - Job description processing webhook
- `NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL` - Resume processing webhook
- `NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL` - Cover letter processing webhook
- `NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL` - ATS evaluation webhook

These are pre-configured to work with n8n running on port 5678.

---

## Troubleshooting

### Webpack Chunk Loading Errors / Evaluation Workflow Issues

If you see errors like `ChunkLoadError` or evaluation workflows fail in the browser:

**Problem:** The `.next` folder (Next.js build cache) has stale files.

**Solution:**
```bash
# Stop the dev server (Ctrl+C), then:
rm -rf .next
npm run dev
```

**Note:** The `.next` folder is automatically recreated by Next.js - this is normal! Always delete it when:
- Pulling new code from git
- Switching branches
- After seeing webpack/chunk errors

### n8n Webhooks Return 404 or 500

This usually means workflows are not activated or are in test mode:

**Solution 1 - Use the setup script (recommended):**
```bash
node setup-n8n-workflows.js
```

**Solution 2 - Manual activation:**
1. Open http://localhost:5678
2. Go to **Workflows**
3. For each workflow, click it to open
4. Click the toggle in the top right to activate
5. Ensure it shows "Active" with a green badge

**Important:** Workflows must be in **production mode** (not test mode) for the webhooks to work with the URLs in `.env.local`

### Script asks for n8n API key

If the script prompts for an n8n API key, it means your n8n instance has authentication enabled.

**Quick fix:** Restart n8n without authentication:
```bash
docker stop n8n && docker rm n8n
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest
```

Then run the setup script again.

### PDF Generation Fails

Ensure you have LaTeX installed on your system:
- **Ubuntu/Debian:** `sudo apt-get install texlive-latex-base texlive-fonts-recommended texlive-latex-extra`
- **macOS:** `brew install basictex`
- **Windows:** Install MiKTeX from https://miktex.org/

### Port Conflicts

If port 5678 is already in use, you can change the n8n port:
```bash
docker run -d --name n8n \
  -p 5679:5678 \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest
```

Then update the webhook URLs in `.env.local` to use the new port.

---

## Technology Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, SQLite
- **PDF Generation:** LaTeX (TeX Live)
- **Workflow Automation:** n8n
- **AI:** Groq / OpenRouter

---

## Support

For issues, questions, or suggestions:
- **GitHub Issues:** https://github.com/Himanshu8881212/LETS-GET-A-JOB-/issues
- **Email:** himanshu.ninawe@gmail.com

---

**Made by Himanshu**
