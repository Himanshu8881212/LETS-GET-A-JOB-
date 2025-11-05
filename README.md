# LETS GET A JOB!

**AI-Powered Resume & Cover Letter Builder with ATS Evaluation and Job Tracking**

A comprehensive Next.js application that helps you create ATS-compatible resumes and cover letters, evaluate them with AI, and track your job applications.

---

## Quick Start Guide

Follow these steps to set up and run the application:

### 1. Install n8n in Docker

First, install n8n using Docker on port 5678:

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest
```

Wait for n8n to start (about 30 seconds), then access it at http://localhost:5678

### 2. Upload Workflows

1. Open n8n at http://localhost:5678
2. Complete the initial setup (create an account)
3. Import all 4 workflows from the `n8n-workflows` folder:
   - Go to **Workflows** → **Add Workflow** → **Import from File**
   - Import each workflow file:
     - `Cover Letter.json`
     - `Eval.json`
     - `Job Desc.json`
     - `Resume.json`

### 3. Setup Language Model Credentials

Configure the AI language model credentials in n8n:

1. Open any of the imported workflows
2. Click on the language model node (Groq or similar)
3. Click **Credentials** → **Create New Credential**
4. Enter your API key from your language model provider
   - For Groq: Get your API key from https://console.groq.com/keys
5. Save the credential
6. Repeat for all workflows (or use the same credential across all)

### 4. Activate All Workflows

Activate all 4 workflows in n8n:

1. Go to **Workflows** in the n8n sidebar
2. For each workflow, click the toggle switch to activate it
3. Ensure all 4 workflows show as "Active"

### 5. Install Dependencies and Run the Application

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

### n8n Webhooks Return 404

Make sure all workflows are activated in n8n:
1. Open http://localhost:5678
2. Go to **Workflows**
3. Check that all 4 workflows show "Active"

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
