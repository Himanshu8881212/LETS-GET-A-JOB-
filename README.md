# LETS GET A JOB!

**AI-Powered Resume & Cover Letter Builder with ATS Evaluation and Job Tracking**

A comprehensive Next.js application that helps you create ATS-compatible resumes and cover letters, evaluate them with AI, and track your job applications.

---

## 🚀 Complete Fresh Start (New User)

**Starting completely fresh? Follow these steps:**

```bash
# 1. Clone the repository (if you haven't already)
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-

# 2. Clean up any existing setup (optional, if you had issues before)
docker stop n8n 2>/dev/null || true
docker rm n8n 2>/dev/null || true
rm -rf data/app.db* 2>/dev/null || true

# 3. Copy environment file
cp .env.example .env.local

# 4. Install dependencies
npm install

# 5. Start n8n in Docker (no authentication, port 5678)
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest

# Wait 30 seconds for n8n to fully start
sleep 30

# 6. Setup n8n workflows (you'll need Groq and Tavily API keys)
node setup-n8n-workflows.js

# 7. Start the application
npm run dev
```

**Done!** Open http://localhost:3000 in your browser.

### What You'll Need:
- **Docker** installed and running
- **Node.js** 18+ installed
- **Groq API Key** - Get free from https://console.groq.com/keys
- **Tavily API Key** - Get free from https://tavily.com

---

## From Scratch Setup (TL;DR)

```bash
# 1. Start n8n in Docker (port 5678, no auth)
docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest

# 2. Setup workflows (requires Groq and Tavily API keys)
#    Groq: https://console.groq.com/keys
#    Tavily: https://tavily.com
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

Run the automated setup script:

```bash
node setup-n8n-workflows.js
```

The script will prompt you for:
1. **Groq API Key** (required) - Get from https://console.groq.com/keys

The script will automatically:
- Create credentials in n8n
- Import all 4 workflows
- Link credentials to workflows
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
