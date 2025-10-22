#!/bin/bash

# Test script for LETS GET A JOB application
# Tests empty and filled resume/cover letter generation

echo "🧪 Testing LETS GET A JOB Application"
echo "======================================"
echo ""

API_URL="http://localhost:3001"

# Test 1: Empty Resume
echo "📄 Test 1: Generating EMPTY resume..."
curl -X POST "$API_URL/api/generate-resume" \
  -H "Content-Type: application/json" \
  -d '{
    "personalInfo": {"firstName": "", "lastName": "", "email": "", "phone": "", "linkedin": "", "github": ""},
    "summary": "",
    "skillCategories": [],
    "experiences": [],
    "projects": [],
    "education": [],
    "certifications": [],
    "languages": [],
    "awards": [],
    "publications": [],
    "extracurricular": [],
    "volunteer": [],
    "hobbies": [],
    "sectionOrder": []
  }' \
  --output test-data/output/empty-resume.pdf \
  -w "\nHTTP Status: %{http_code}\n"

if [ -f "test-data/output/empty-resume.pdf" ]; then
  SIZE=$(ls -lh test-data/output/empty-resume.pdf | awk '{print $5}')
  echo "✅ Empty resume generated successfully ($SIZE)"
  open test-data/output/empty-resume.pdf
else
  echo "❌ Empty resume generation failed"
fi

echo ""

# Test 2: Filled Resume
echo "📄 Test 2: Generating FILLED resume..."
curl -X POST "$API_URL/api/generate-resume" \
  -H "Content-Type: application/json" \
  -d @test-data/filled-resume.json \
  --output test-data/output/filled-resume.pdf \
  -w "\nHTTP Status: %{http_code}\n"

if [ -f "test-data/output/filled-resume.pdf" ]; then
  SIZE=$(ls -lh test-data/output/filled-resume.pdf | awk '{print $5}')
  echo "✅ Filled resume generated successfully ($SIZE)"
  open test-data/output/filled-resume.pdf
else
  echo "❌ Filled resume generation failed"
fi

echo ""

# Test 3: Empty Cover Letter
echo "✉️  Test 3: Generating EMPTY cover letter..."
curl -X POST "$API_URL/api/generate-cover-letter" \
  -H "Content-Type: application/json" \
  -d '{
    "personalInfo": {"firstName": "", "lastName": "", "email": "", "phone": "", "linkedin": "", "address": ""},
    "recipient": {"name": "", "title": "", "company": "", "address": ""},
    "content": {"date": "", "opening": "", "bodyParagraphs": [], "closing": ""}
  }' \
  --output test-data/output/empty-cover-letter.pdf \
  -w "\nHTTP Status: %{http_code}\n"

if [ -f "test-data/output/empty-cover-letter.pdf" ]; then
  SIZE=$(ls -lh test-data/output/empty-cover-letter.pdf | awk '{print $5}')
  echo "✅ Empty cover letter generated successfully ($SIZE)"
  open test-data/output/empty-cover-letter.pdf
else
  echo "❌ Empty cover letter generation failed"
fi

echo ""

# Test 4: Filled Cover Letter
echo "✉️  Test 4: Generating FILLED cover letter..."
curl -X POST "$API_URL/api/generate-cover-letter" \
  -H "Content-Type: application/json" \
  -d @test-data/filled-cover-letter.json \
  --output test-data/output/filled-cover-letter.pdf \
  -w "\nHTTP Status: %{http_code}\n"

if [ -f "test-data/output/filled-cover-letter.pdf" ]; then
  SIZE=$(ls -lh test-data/output/filled-cover-letter.pdf | awk '{print $5}')
  echo "✅ Filled cover letter generated successfully ($SIZE)"
  open test-data/output/filled-cover-letter.pdf
else
  echo "❌ Filled cover letter generation failed"
fi

echo ""
echo "======================================"
echo "✨ All tests completed!"
echo "Check test-data/output/ for generated PDFs"

