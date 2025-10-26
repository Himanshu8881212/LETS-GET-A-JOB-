#!/bin/bash

# Test all 4 n8n webhooks
# Usage: ./scripts/test-webhooks.sh

echo "🧪 Testing n8n Webhooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Job Description Processing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Job Description Processing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $NEXT_PUBLIC_N8N_JD_WEBHOOK_URL"
echo ""

if [ -z "$NEXT_PUBLIC_N8N_JD_WEBHOOK_URL" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_N8N_JD_WEBHOOK_URL not set${NC}"
else
  echo "📤 Sending request..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$NEXT_PUBLIC_N8N_JD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"jobUrl":"https://www.linkedin.com/jobs/view/3901234567"}')
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "📥 Response Status: $HTTP_STATUS"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Response:"
    echo "$BODY"
  fi
fi

echo ""
echo ""

# Test 2: Resume Processing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Resume Processing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL"
echo ""

if [ -z "$NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL not set${NC}"
else
  # Create a test PDF if it doesn't exist
  if [ ! -f /tmp/test-resume.pdf ]; then
    echo "Creating test PDF..."
    echo "Test Resume Content" > /tmp/test-resume.txt
    # Use system tools to create a simple PDF (macOS)
    if command -v textutil &> /dev/null; then
      textutil -convert html /tmp/test-resume.txt -output /tmp/test-resume.html
      if command -v wkhtmltopdf &> /dev/null; then
        wkhtmltopdf /tmp/test-resume.html /tmp/test-resume.pdf 2>/dev/null
      else
        echo -e "${YELLOW}⚠️  wkhtmltopdf not installed, skipping PDF test${NC}"
        echo "   Install with: brew install wkhtmltopdf"
        echo ""
        echo ""
        # Skip to next test
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "TEST 3: Cover Letter Processing"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "URL: $NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL"
        echo ""
        echo -e "${YELLOW}⚠️  Skipped (same as Resume test)${NC}"
        echo ""
        echo ""
        
        # Jump to Test 4
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "TEST 4: ATS Evaluation"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "URL: $NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL"
        echo ""
        
        if [ -z "$NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL" ]; then
          echo -e "${RED}❌ NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL not set${NC}"
        else
          echo "📤 Sending request..."
          RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{
              "resume_text": "Software Engineer with 5 years of React experience",
              "cover_letter_text": "I am excited to apply for this position",
              "job_description": "Looking for a Software Engineer with React experience"
            }')
          
          HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
          BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
          
          echo "📥 Response Status: $HTTP_STATUS"
          
          if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ SUCCESS${NC}"
            echo "Response:"
            echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
          else
            echo -e "${RED}❌ FAILED${NC}"
            echo "Response:"
            echo "$BODY"
          fi
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🏁 Testing Complete"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
      fi
    fi
  fi
  
  echo "📤 Sending request..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$NEXT_PUBLIC_N8N_RESUME_WEBHOOK_URL" \
    -F "data=@/tmp/test-resume.pdf")
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "📥 Response Status: $HTTP_STATUS"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Response:"
    echo "$BODY"
  fi
fi

echo ""
echo ""

# Test 3: Cover Letter Processing (same as resume)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Cover Letter Processing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $NEXT_PUBLIC_N8N_COVER_LETTER_WEBHOOK_URL"
echo ""
echo -e "${YELLOW}⚠️  Skipped (same as Resume test)${NC}"

echo ""
echo ""

# Test 4: ATS Evaluation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: ATS Evaluation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL"
echo ""

if [ -z "$NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL not set${NC}"
else
  echo "📤 Sending request..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$NEXT_PUBLIC_N8N_EVALUATION_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{
      "resume_text": "Software Engineer with 5 years of React experience",
      "cover_letter_text": "I am excited to apply for this position",
      "job_description": "Looking for a Software Engineer with React experience"
    }')
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "📥 Response Status: $HTTP_STATUS"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Response:"
    echo "$BODY"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Testing Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

