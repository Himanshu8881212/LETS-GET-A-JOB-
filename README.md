# LETS GET A JOB

AI-Powered Resume & Cover Letter Builder with ATS Evaluation

---

## 🚀 Quick Start (Docker)

### Prerequisites

- Docker Desktop installed and running
- **Mistral API Key**: <https://console.mistral.ai/api-keys>
- **Tavily API Key**: <https://tavily.com>

---

### Step 1: Start n8n

```bash
docker-compose --profile n8n up -d
```

Wait ~30 seconds, then open: **<http://localhost:5679>**

---

### Step 2: Get n8n API Key

1. Create an account in n8n (first time only)
2. Go to **Settings → API**
3. Click **"Create an API key"**
4. Copy the key

---

### Step 3: Run Setup Script

```bash
node setup-n8n-workflows.js
```

The script will prompt you for:

- **n8n API key** (from Step 2)
- **Mistral API key**
- **Tavily API key**

It will automatically:

- Create Mistral credentials in n8n
- Import all 4 workflows
- Activate them in production mode

---

### Step 4: Start the App

```bash
docker-compose --profile app up -d --build
```

> ⏳ First build takes 5-10 minutes (downloads LaTeX for PDF generation)

---

### ✅ Done

| Service | URL |
|---------|-----|
| **App** | <http://localhost:3000> |
| **n8n** | <http://localhost:5679> |

---

## 📋 Useful Commands

| Command | Description |
|---------|-------------|
| `docker-compose --profile app up -d` | Start everything |
| `docker-compose --profile app down` | Stop everything |
| `docker-compose --profile app down -v` | Stop + clean slate |
| `docker logs lets-get-a-job-app` | View app logs |
| `docker logs n8n` | View n8n logs |

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
docker-compose --profile app down -v
docker container prune -f
docker-compose --profile app up -d
```

### Workflows Not Showing in n8n

Run the setup script again:

```bash
node setup-n8n-workflows.js
```

---

## Features

- **Resume Builder** - LaTeX templates, version control, live preview
- **Cover Letter Builder** - Customizable templates
- **AI ATS Evaluator** - Scores, suggestions, job description parsing
- **Job Tracker** - Kanban board for applications

---

## Tech Stack

- Next.js 14, React, TypeScript, Tailwind CSS
- SQLite, LaTeX PDF generation
- n8n workflow automation, Mistral AI

---

**Made by Himanshu**
