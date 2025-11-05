#!/bin/bash
set -e

echo "🚀 Starting LETS GET A JOB application..."

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -sf http://n8n:5678/healthz > /dev/null 2>&1; then
    echo "✅ n8n is ready!"
    break
  fi

  attempt=$((attempt + 1))
  echo "   Attempt $attempt/$max_attempts - n8n not ready yet..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ n8n failed to start after $max_attempts attempts"
  exit 1
fi

# Additional wait to ensure n8n is fully ready
sleep 5

# Setup n8n workflows if API keys are provided
if [ -n "$GROQ_API_KEY" ] && [ -n "$TAVILY_API_KEY" ]; then
  echo "🔧 Setting up n8n workflows..."

  # Create a temporary setup script that uses environment variables
  node << 'EOF'
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the setup script
const setupScript = fs.readFileSync('./setup-n8n-workflows.js', 'utf8');

// Modify to use environment variables instead of prompts
const modifiedScript = setupScript
  .replace('N8N_HOST = \'localhost\'', 'N8N_HOST = process.env.N8N_HOST || \'n8n\'')
  .replace('await prompt(\'Enter your Groq API key', '// await prompt(\'Enter your Groq API key')
  .replace('await prompt(\'Enter your Tavily API key', '// await prompt(\'Enter your Tavily API key')
  .replace('const groqApiKey =', 'const groqApiKey = process.env.GROQ_API_KEY || ')
  .replace('const tavilyApiKey =', 'const tavilyApiKey = process.env.TAVILY_API_KEY || ');

// Run the modified setup
eval(modifiedScript.replace('main().catch', 'main().then(() => console.log("Setup complete!")).catch'));
EOF

  if [ $? -eq 0 ]; then
    echo "✅ n8n workflows setup complete!"
  else
    echo "⚠️  n8n workflow setup failed, but continuing..."
  fi
else
  echo "⚠️  GROQ_API_KEY or TAVILY_API_KEY not set - skipping workflow setup"
  echo "   You'll need to run 'node setup-n8n-workflows.js' manually"
fi

# Copy .env.example to .env.local if it doesn't exist
if [ ! -f /app/.env.local ]; then
  echo "📝 Creating .env.local from .env.example..."
  cp /app/.env.example /app/.env.local
fi

echo "🎉 Starting Next.js application..."
echo "   Application will be available at http://localhost:3000"
echo "   n8n will be available at http://localhost:5678"

# Execute the main command
exec "$@"
