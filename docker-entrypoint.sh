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
if [ -n "$N8N_API_KEY" ] && [ -n "$GROQ_API_KEY" ] && [ -n "$TAVILY_API_KEY" ]; then
  echo "🔧 Setting up n8n workflows..."
  echo "   Using n8n at: http://$N8N_HOST:$N8N_PORT"

  # Export N8N_API_KEY for the setup script
  export N8N_API_KEY="$N8N_API_KEY"

  # Run setup script with environment variables
  node setup-n8n-workflows.js << EOF
$GROQ_API_KEY
$TAVILY_API_KEY
EOF

  if [ $? -eq 0 ]; then
    echo "✅ n8n workflows setup complete!"
  else
    echo "⚠️  n8n workflow setup failed, but continuing..."
    echo "   You can run 'docker exec -it lets-get-a-job-app node setup-n8n-workflows.js' manually"
  fi
else
  echo "⚠️  Missing API keys - skipping workflow setup"
  echo "   Required: N8N_API_KEY, GROQ_API_KEY, TAVILY_API_KEY"
  echo "   You can run 'docker exec -it lets-get-a-job-app node setup-n8n-workflows.js' manually"
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
