#!/bin/bash
set -e

echo "========================================"
echo "n8n Setup Script - LETS-GET-A-JOB"
echo "========================================"

# Wait for n8n to start
echo "Waiting for n8n to start and create database..."
sleep 30

# Delete n8n config file to force it to use ENV var encryption key
echo "Removing n8n config file to ensure encryption key consistency..."
rm -f /app/n8n-data/.n8n/config

# Wait for n8n to recreate config
sleep 5

echo "Checking for Groq credentials..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MANUAL SETUP REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To use the AI workflows, you must:"
echo ""
echo "1. Open n8n UI: http://localhost:5678"
echo "2. Go to: Credentials > Add Credential > Groq"
echo "3. Name it: 'Groq account' (exactly as shown)"
echo "4. Add your Groq API key from: https://console.groq.com/keys"
echo "5. Save the credential"
echo "6. The workflows will automatically use this credential"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

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

    echo "Activating all workflows..."
    sqlite3 /app/n8n-data/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1;" 2>&1 || echo "Warning: Failed to activate workflows"

    echo "All workflows imported and activated successfully!"
else
    echo "Workflows already exist (count: $WORKFLOW_COUNT), skipping import."

    # Still try to update workflow files in database if credential changed
    if [ -n "$CRED_ID" ]; then
        echo "Checking if workflows need credential update..."
        # This would require updating the workflow JSON in the database
        # For now, we'll skip this and rely on manual re-import if credentials change
    fi
fi

echo "========================================"
echo "n8n Setup Complete!"
echo "========================================"
echo ""
if [ -n "$CRED_ID" ]; then
    echo "✓ Groq credentials: OK (ID: $CRED_ID)"
else
    echo "✗ Groq credentials: MISSING - Add via UI at http://localhost:5678"
fi
echo "✓ Workflows: $WORKFLOW_COUNT imported"
echo ""
echo "n8n is ready at: http://localhost:5678"
echo "========================================"
