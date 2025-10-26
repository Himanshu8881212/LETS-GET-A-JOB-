# 🔍 n8n Webhook Diagnostic Report

**Date:** 2025-01-26  
**Issue:** 500 Internal Server Error on `/webhook/process-jd`

---

## ❌ Problem Summary

The Job Description Processing webhook is returning a **500 Internal Server Error**:

```
Error: There was a problem executing the workflow
```

**HTTP Status:** 500  
**Webhook URL:** `https://supercoincident-unvanquishing-bula.ngrok-free.dev/webhook/process-jd`

---

## 🧪 Test Results

### Test 1: Job Description Webhook ❌ FAILED

**Request:**
```bash
curl -X POST "https://supercoincident-unvanquishing-bula.ngrok-free.dev/webhook/process-jd" \
  -H "Content-Type: application/json" \
  -d '{"jobUrl":"https://www.linkedin.com/jobs/view/3901234567"}'
```

**Response:**
```json
{
  "code": 0,
  "message": "There was a problem executing the workflow",
  "stacktrace": "Error: There was a problem executing the workflow\n    at Object.executeWebhook (/Users/himanshuninawe/.nvm/versions/node/v22.14.0/lib/node_modules/n8n/src/webhooks/webhook-helpers.ts:767:7)"
}
```

**HTTP Status:** 500

---

## 🔍 Root Cause Analysis

The error indicates that:

1. ✅ **n8n is running** - The webhook endpoint exists and responds
2. ✅ **Webhook is registered** - It accepts POST requests
3. ❌ **Workflow execution fails** - Something inside the workflow is broken

### Possible Causes:

1. **Missing API Keys/Credentials**
   - The workflow might need API keys for scraping services
   - LinkedIn scraping might require authentication
   - AI/LLM API keys might be missing

2. **Broken Workflow Nodes**
   - HTTP Request node might be misconfigured
   - Scraping logic might be failing
   - Response formatting might be incorrect

3. **Timeout Issues**
   - LinkedIn might be blocking the scraper
   - Network timeout on external API calls

4. **Missing Dependencies**
   - Required npm packages not installed
   - Browser/Puppeteer not configured for scraping

---

## 🛠️ Required Actions

### Action 1: Check n8n Workflow Execution Logs

1. Open n8n UI: `https://supercoincident-unvanquishing-bula.ngrok-free.dev`
2. Navigate to **Executions** tab
3. Find the failed execution for "Job Desc" workflow
4. Check the error details on the failed node

### Action 2: Verify Workflow Configuration

Check the "Job Desc" workflow for:

- ✅ **Webhook node** - Configured for POST with path `/webhook/process-jd`
- ✅ **HTTP Request node** - URL scraping configuration
- ✅ **AI/LLM node** - API keys configured
- ✅ **Response node** - Returns `{ "output": "..." }` format

### Action 3: Test with Simple Workflow

Create a minimal test workflow:

```
Webhook (POST /webhook/test)
  ↓
Set Node (return static data)
  ↓
Respond to Webhook (return JSON)
```

If this works, the issue is in the scraping/processing logic.

### Action 4: Check Required Credentials

The workflow likely needs:

- **OpenAI API Key** (for AI processing)
- **Scraping Service API Key** (if using a service)
- **Browser/Puppeteer** (if doing direct scraping)

---

## 📋 Recommended Next Steps

### Step 1: Access n8n UI

```bash
# Open in browser
open https://supercoincident-unvanquishing-bula.ngrok-free.dev
```

### Step 2: Check Workflow Executions

1. Click on **Executions** in the left sidebar
2. Find the most recent failed execution
3. Click on it to see detailed error
4. Identify which node failed

### Step 3: Fix the Failing Node

Common fixes:

**If HTTP Request node fails:**
- Check the URL is accessible
- Add proper headers (User-Agent, etc.)
- Handle rate limiting/blocking

**If AI node fails:**
- Verify API key is set in credentials
- Check API quota/limits
- Test with simpler prompt

**If Code node fails:**
- Check for syntax errors
- Verify all required data is available
- Add error handling

### Step 4: Test the Fixed Workflow

Use the HTML tester:
```bash
open LETS-GET-A-JOB/scripts/test-n8n-webhooks.html
```

---

## 🎯 Quick Fix Checklist

- [ ] Open n8n UI and check execution logs
- [ ] Identify which node is failing
- [ ] Verify all credentials are configured
- [ ] Test with a simple static response first
- [ ] Add error handling to the workflow
- [ ] Test with the HTML webhook tester
- [ ] Verify all 4 webhooks work

---

## 📞 Support Information

**n8n Instance:** Running locally via ngrok  
**Node Version:** v22.14.0  
**n8n Location:** `/Users/himanshuninawe/.nvm/versions/node/v22.14.0/lib/node_modules/n8n`

**Webhook URLs:**
- Job Description: `/webhook/process-jd` ❌
- Resume: `/webhook/process-resume` ❓
- Cover Letter: `/webhook/process-cover-letter` ❓
- ATS Evaluation: `/webhook/evaluate-ats` ❓

---

## 🔧 Debugging Commands

```bash
# Check n8n logs
n8n start --tunnel

# Test webhook directly
curl -X POST "https://supercoincident-unvanquishing-bula.ngrok-free.dev/webhook/process-jd" \
  -H "Content-Type: application/json" \
  -d '{"jobUrl":"https://example.com/job"}' \
  -v

# Open n8n UI
open https://supercoincident-unvanquishing-bula.ngrok-free.dev
```

---

## ✅ Resolution Steps

1. **Open n8n UI** and check the workflow execution logs
2. **Identify the failing node** in the "Job Desc" workflow
3. **Fix the configuration** (add credentials, fix logic, etc.)
4. **Test again** using the HTML webhook tester
5. **Repeat for all 4 workflows** to ensure they all work

---

**Status:** 🔴 REQUIRES MANUAL INTERVENTION IN n8n UI

The workflows need to be debugged and fixed in the n8n interface. The error is happening during workflow execution, not in the application code.

