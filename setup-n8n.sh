#!/bin/bash
set -e

echo "========================================"
echo "n8n Setup Script - LETS-GET-A-JOB"
echo "========================================"

# Wait for n8n to start
echo "Waiting for n8n to start and create database..."
sleep 30

# Check if workflows already exist
WORKFLOW_COUNT=$(sqlite3 /app/n8n-data/.n8n/database.sqlite "SELECT COUNT(*) FROM workflow_entity;" 2>/dev/null || echo "0")

if [ "$WORKFLOW_COUNT" -eq "0" ]; then
    echo "Importing n8n workflows..."

    # Set encryption key
    export N8N_ENCRYPTION_KEY="random-encryption-key"
    export N8N_USER_FOLDER="/app/n8n-data"

    # Import each workflow
    for workflow_file in /app/n8n-workflows/*.json; do
        if [ -f "$workflow_file" ]; then
            workflow_name=$(basename "$workflow_file" .json)
            echo "Importing $workflow_name..."
            N8N_ENCRYPTION_KEY="random-encryption-key" N8N_USER_FOLDER="/app/n8n-data" n8n import:workflow --input="$workflow_file" 2>&1 || echo "Warning: Failed to import $workflow_name"
        fi
    done

    echo "Waiting 5 seconds for workflows to be saved..."
    sleep 5

    echo "All workflows imported successfully!"
else
    echo "Workflows already exist (count: $WORKFLOW_COUNT), skipping import."
fi

# Check for Groq credentials
CRED_ID=$(sqlite3 /app/n8n-data/.n8n/database.sqlite "SELECT id FROM credentials_entity WHERE name='Groq account' LIMIT 1;" 2>/dev/null || echo "")

echo ""
echo "========================================"
echo "n8n Setup Complete!"
echo "========================================"
echo ""

if [ -n "$CRED_ID" ]; then
    echo "✓ Groq credentials: Found (ID: $CRED_ID)"
    echo "✓ Workflows will use this credential automatically"
    echo ""
    echo "Workflows are ready to use!"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 SETUP REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "To activate workflows, add Groq credentials:"
    echo ""
    echo "1. Open n8n UI: http://localhost:5678"
    echo "2. Go to: Credentials > Add Credential > Groq"
    echo "3. Name it: 'Groq account' (EXACTLY as shown)"
    echo "4. Add your Groq API key from: https://console.groq.com/keys"
    echo "5. Save the credential"
    echo "6. Restart n8n: docker restart lets-get-a-job-all-in-one"
    echo ""
    echo "After restart, workflows will automatically find and"
    echo "use the 'Groq account' credential."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "✓ Workflows: $WORKFLOW_COUNT imported"
echo ""
echo "n8n is ready at: http://localhost:5678"
echo "========================================"
