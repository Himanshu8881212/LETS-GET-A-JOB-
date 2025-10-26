# n8n Workflows

This directory contains the 4 pre-configured n8n workflows for the LETS-GET-A-JOB application.

## Workflows

### 1. Job Description Processing (`job-desc.json`)
- **Webhook Path**: `/webhook/process-jd`
- **Input**: `{ "jobUrl": "https://..." }`
- **Output**: `{ "output": "parsed job description text" }`
- **Purpose**: Extracts and cleans job descriptions from URLs using AI

### 2. Resume Processing (`resume.json`)
- **Webhook Path**: `/webhook/process-resume`
- **Input**: PDF file (multipart/form-data, field name: "data")
- **Output**: `{ "output": "cleaned resume text" }`
- **Purpose**: Extracts and cleans text from resume PDFs using AI

### 3. Cover Letter Processing (`cover-letter.json`)
- **Webhook Path**: `/webhook/process-cover-letter`
- **Input**: PDF file (multipart/form-data, field name: "data")
- **Output**: `{ "output": "cleaned cover letter text" }`
- **Purpose**: Extracts and cleans text from cover letter PDFs using AI

### 4. ATS Evaluation (`eval.json`)
- **Webhook Path**: `/webhook/evaluate-ats`
- **Input**: 
  ```json
  {
    "resume_text": "...",
    "cover_letter_text": "...",
    "job_description": "..."
  }
  ```
- **Output**: Complete evaluation JSON with scores, fixes, keywords, etc.
- **Purpose**: Provides AI-powered ATS evaluation and optimization suggestions

## Automatic Import

These workflows are automatically imported when you start the Docker containers for the first time.

The import process:
1. Checks if workflows already exist in the n8n database
2. If not found, imports all 4 workflows
3. Activates the workflows automatically
4. Makes them available at their webhook endpoints

## Manual Import

If you need to manually import workflows:

```bash
# Access n8n container
docker-compose exec n8n sh

# Import a workflow
n8n import:workflow --input=/workflows/job-desc.json
n8n import:workflow --input=/workflows/resume.json
n8n import:workflow --input=/workflows/cover-letter.json
n8n import:workflow --input=/workflows/eval.json
```

## Workflow Configuration

All workflows are configured with:
- **AI Agent**: Uses OpenRouter Chat Model with GPT-4
- **MCP Client**: Tavily extract tool for web scraping
- **Webhook Trigger**: Responds with JSON
- **Error Handling**: Retry on fail enabled
- **Execution Order**: v1 (sequential)

## Testing Workflows

Test the workflows using curl:

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

Or use the management script:

```bash
./docker-manage.sh test
```

## Modifying Workflows

To modify workflows:

1. Access n8n dashboard: http://localhost:5678
2. Edit the workflow in the visual editor
3. Save changes
4. Export updated workflow if needed:
   ```bash
   docker-compose exec n8n n8n export:workflow --id=WORKFLOW_ID --output=/workflows/
   ```

## Notes

- All workflows use the same AI model and credentials
- Workflows are stored in the n8n database (Docker volume)
- These JSON files are used for initial import only
- Changes made in n8n UI are not reflected in these files unless exported

