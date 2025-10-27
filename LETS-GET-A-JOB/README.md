# LETS GET A JOB! ��

**AI-Powered Resume & Cover Letter Builder with ATS Evaluation and Job Tracking**

A comprehensive Next.js application that helps you create ATS-compatible resumes and cover letters, evaluate them with AI, and track your job applications - all with version control and professional LaTeX PDF generation.

---

## 🌟 Features

### ✅ **Resume Builder**
- **Professional LaTeX Templates** - Generate beautiful, ATS-compatible PDFs
- **Version Control** - Semantic versioning with branching (v1.0, v1.1, v2.0, etc.)
- **Live Preview** - See your resume before downloading
- **Dynamic Sections** - Enable/disable sections as needed
- **Demo Data** - Pre-filled examples to get started quickly

### ✅ **Cover Letter Builder**
- **Customizable Templates** - Professional LaTeX-generated PDFs
- **Version Control** - Track different versions for different applications
- **Live Preview** - Preview before saving
- **Company-Specific** - Tailor each letter to the job

### 🔧 **AI ATS Evaluator** (Requires Setup)
- **AI-Powered Analysis** - Evaluate resume against job descriptions
- **ATS Compatibility Score** - Check how well your resume passes ATS systems
- **Improvement Suggestions** - Get actionable feedback
- **Job Description Parsing** - Extract requirements from job URLs

### 📊 **Job Tracker** (Requires Setup)
- **Kanban Board** - Visual pipeline (Applied → Interview → Offer → Rejected)
- **Application History** - Track all your applications
- **Document Linking** - Link resumes and cover letters to applications
- **Analytics** - Success rates and insights

---

## 🚀 Quick Start

### Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
   cd LETS-GET-A-JOB-/LETS-GET-A-JOB
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d --build
   ```

3. **Wait for services to initialize** (approximately 2 minutes):
   ```bash
   # Check if services are ready
   docker logs lets-get-a-job-all-in-one
   ```

4. **⚠️ IMPORTANT: Activate n8n Workflows** (Required for AI features):
   - Open http://localhost:5678 in your browser
   - **No login required** - n8n runs without authentication for local development
   - Click on **Workflows** in the left sidebar
   - For each workflow (job-desc, resume, cover-letter, eval):
     - Click on the workflow name
     - Click the **Inactive** toggle in the top-right corner to activate it
   - See detailed instructions in the **n8n Workflow Setup** section below

5. **Access the application:**
   - **Main Application:** http://localhost:3000
   - **n8n Workflow Editor:** http://localhost:5678 (no login required)

---

## 📖 Usage Guide

### **Resume Builder** ✅ Works Out of the Box

1. Navigate to **Resume Builder** from the home page
2. Fill in your information (or use the pre-filled demo data)
3. Enable/disable sections using the checkboxes
4. Click **Preview** to see your PDF
5. Click **Save** to save to version lineage
6. Click **Versions** to view, download, or branch your resumes

**Tips:**
- Use semantic versioning: `main`, `tech-focused`, `senior-level`
- Branch from existing versions to create variations
- Download PDFs directly from the Versions page

### **Cover Letter Builder** ✅ Works Out of the Box

1. Navigate to **Cover Letter Builder** from the home page
2. Fill in your information and the recipient's details
3. Write your opening, body, and closing paragraphs
4. Click **Preview** to see your PDF
5. Click **Save** to save to version lineage
6. Click **Versions** to manage your cover letters

**Tips:**
- Create different versions for different companies
- Use the same branching strategy as resumes
- Link cover letters to specific job applications

### **AI ATS Evaluator** ⚠️ Requires n8n Workflow Activation

**Before using:** Make sure you've activated the n8n workflows (see Step 4 in Installation above)

Once configured:
1. Navigate to **AI ATS Evaluator**
2. Select a resume from your lineage
3. Select a cover letter from your lineage
4. Enter the job posting URL
5. Click **Evaluate with AI**
6. Wait for AI analysis (may take 30-60 seconds)
7. Review the evaluation results
8. Check **History** to see past evaluations

### **Job Tracker**

1. Navigate to **Job Tracker**
2. Click **Add Application**
3. Fill in job details
4. Link your resume and cover letter versions
5. Link AI evaluation (if available)
6. Track progress through the pipeline
7. View analytics and success rates

---

## 🔧 n8n Workflow Setup (Required for AI Features)

**⚠️ IMPORTANT:** The AI ATS Evaluator requires manual n8n workflow activation. This is a one-time setup.

### **Authentication**

**No login required!** n8n is configured to run without authentication for local development. Simply open http://localhost:5678 and you'll have immediate access to the workflow editor.

> **Note:** For production deployments, you should enable n8n user management by removing `N8N_USER_MANAGEMENT_DISABLED="true"` from the Dockerfile and setting up proper authentication.

### **Why is manual activation needed?**

n8n workflows need to be manually activated to register their webhooks. This is a limitation of how n8n handles workflow imports.

### **Step-by-Step Activation:**

1. **Access n8n:**
   - Open http://localhost:5678 in your browser
   - **No login required** - you'll see the n8n workflow editor immediately

2. **View Workflows:**
   - Click on **Workflows** in the left sidebar
   - You should see 4 workflows:
     - `job-desc` - Job description parser
     - `resume` - Resume analyzer
     - `cover-letter` - Cover letter analyzer
     - `eval` - ATS evaluation

3. **Activate Each Workflow:**
   
   For **each of the 4 workflows**:
   - Click on the workflow name
   - Look for the toggle switch in the top-right corner (it will say "Inactive")
   - Click the toggle to activate it
   - It should turn green and say "Active"
   - Repeat for all 4 workflows

4. **Verify Activation:**
   
   Run this command to verify all workflows are active:
   ```bash
   docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/database.sqlite "SELECT name, active FROM workflow_entity;"
   ```
   
   You should see:
   ```
   cover-letter|1
   eval|1
   job-desc|1
   resume|1
   ```

5. **Test Webhooks:**
   
   Test that webhooks are working:
   ```bash
   curl -X POST http://localhost:5678/webhook/process-jd \
     -H "Content-Type: application/json" \
     -d '{"jobUrl":"https://example.com/job"}'
   ```
   
   Should return JSON (not a 404 error)

### **Configure AI Provider (Optional)**

The workflows use OpenRouter for AI. To use your own API key:

1. Open each workflow in n8n
2. Click on the **OpenRouter Chat Model** node
3. Click **Credentials** → **Create New**
4. Enter your OpenRouter API key
5. Save and activate the workflow

**Get an OpenRouter API key:** https://openrouter.ai/

---

## ⚙️ Configuration

### **Environment Variables**

The application uses the following environment variables (pre-configured in `docker-compose.yml`):

```yaml
# Application
NODE_ENV=production
PORT=3000

# n8n Configuration
N8N_USER_MANAGEMENT_DISABLED=true  # No authentication required (local development)
N8N_PORT=5678
N8N_HOST=0.0.0.0

# n8n Webhooks (pre-configured)
NEXT_PUBLIC_N8N_JD_WEBHOOK_URL=http://localhost:5678/webhook/process-jd
NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL=http://localhost:5678/webhook/process-resume
NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL=http://localhost:5678/webhook/process-cover-letter
NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL=http://localhost:5678/webhook/evaluate-ats
```

### **Security Note**

⚠️ **For Local Development Only:** n8n is configured without authentication (`N8N_USER_MANAGEMENT_DISABLED=true`) for ease of local development.

**For production deployments:**
1. Remove `N8N_USER_MANAGEMENT_DISABLED="true"` from the Dockerfile (line 115)
2. Set up n8n user management with proper credentials
3. Configure firewall rules to restrict access to n8n port (5678)
4. Use environment variables for sensitive credentials

### **Data Persistence**

All data is stored in Docker volumes:
- `app_data` - Application database, PDFs, and documents
- `n8n_data` - n8n workflows and execution history

**Backup your data:**
```bash
# Backup application data
docker run --rm -v lets-get-a-job_app_data:/data -v $(pwd):/backup alpine tar czf /backup/app_data_backup.tar.gz -C /data .

# Backup n8n data
docker run --rm -v lets-get-a-job_n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n_data_backup.tar.gz -C /data .
```

**Restore from backup:**
```bash
# Restore application data
docker run --rm -v lets-get-a-job_app_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/app_data_backup.tar.gz"

# Restore n8n data
docker run --rm -v lets-get-a-job_n8n_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/n8n_data_backup.tar.gz"
```

---

## 🐛 Troubleshooting

### **Services Not Starting**

```bash
# Check container logs
docker logs lets-get-a-job-all-in-one

# Check service health
curl http://localhost:3000/api/health
curl http://localhost:5678/healthz
```

### **PDF Generation Fails**

```bash
# Check LaTeX installation
docker exec lets-get-a-job-all-in-one pdflatex --version

# Test manual PDF generation
docker exec lets-get-a-job-all-in-one bash -c "cd /app && make resume"
```

### **n8n Webhooks Return 404**

This means workflows are not activated. Follow the **n8n Workflow Setup** section above.

```bash
# Check workflow status in database
docker exec lets-get-a-job-all-in-one sqlite3 /app/n8n-data/database.sqlite "SELECT name, active FROM workflow_entity;"

# Should show all workflows with active=1
```

If workflows show `active=0`, you need to activate them manually in the n8n UI.

### **Database Issues**

```bash
# Check database
docker exec lets-get-a-job-all-in-one sqlite3 /app/data/app.db ".tables"

# Reset database (⚠️ DELETES ALL DATA)
docker-compose down -v
docker-compose up -d --build
```

### **Port Conflicts**

If ports 3000 or 5678 are already in use:

1. Edit `docker-compose.yml`
2. Change port mappings:
   ```yaml
   ports:
     - "3001:3000"  # Change 3000 to 3001
     - "5679:5678"  # Change 5678 to 5679
   ```
3. Restart: `docker-compose down && docker-compose up -d`

### **First Preview Fails**

If the first preview attempt fails with "Failed to generate preview", click **Preview** again. This is because the first attempt triggers the LaTeX compilation, and the second attempt reads the generated PDF.

---

## 🏗️ Architecture

### **Technology Stack**

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, SQLite
- **PDF Generation:** LaTeX (TeX Live), pdflatex
- **Workflow Automation:** n8n
- **AI:** OpenRouter (GPT-4, Claude, etc.)
- **Containerization:** Docker, Docker Compose, Supervisor

### **Single-Container Architecture**

Everything runs in **one Docker container**:
- Next.js application (port 3000)
- n8n workflow engine (port 5678)
- SQLite databases (app + n8n)
- LaTeX/TeX Live (PDF generation)
- Supervisor (process manager)

### **Data Flow**

```
User → Next.js UI → API Routes → SQLite Database
                              ↓
                         LaTeX → PDF
                              ↓
                         n8n Webhooks → AI Analysis
```

---

## 📝 Common Commands

```bash
# Start the application
docker-compose up -d --build

# Stop the application
docker-compose down

# View logs
docker logs lets-get-a-job-all-in-one

# Follow logs in real-time
docker logs -f lets-get-a-job-all-in-one

# Restart the application
docker restart lets-get-a-job-all-in-one

# Access container shell
docker exec -it lets-get-a-job-all-in-one bash

# Check service health
curl http://localhost:3000/api/health
curl http://localhost:5678/healthz

# Complete reset (⚠️ DELETES ALL DATA)
docker-compose down -v
docker system prune -af --volumes
docker-compose up -d --build
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **LaTeX** for beautiful PDF generation
- **n8n** for workflow automation
- **OpenRouter** for AI model access
- **Next.js** for the amazing framework

---

## 📞 Support

For issues, questions, or suggestions:
- **GitHub Issues:** https://github.com/Himanshu8881212/LETS-GET-A-JOB-/issues
- **Email:** himanshu.ninawe@gmail.com

---

**Made with ❤️ by Himanshu**
