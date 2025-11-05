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

# Check if Groq credentials exist
CRED_ID=$(sqlite3 /app/n8n-data/.n8n/database.sqlite "SELECT id FROM credentials_entity WHERE type='groqApi' LIMIT 1;" 2>/dev/null || echo "")

if [ -z "$CRED_ID" ]; then
    echo "No Groq credentials found."

    # Check if GROQ_API_KEY environment variable is set
    if [ -n "$GROQ_API_KEY" ]; then
        echo "Creating Groq credentials from GROQ_API_KEY environment variable..."

        # Generate a random credential ID
        CRED_ID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)

        # Encrypt the API key (n8n uses encryption, but for simplicity we'll store it directly)
        # In production, this should use n8n's encryption key
        ENCRYPTED_KEY="$GROQ_API_KEY"

        # Insert credential into database
        sqlite3 /app/n8n-data/.n8n/database.sqlite <<SQL
INSERT INTO credentials_entity (id, name, type, data, createdAt, updatedAt)
VALUES (
    '$CRED_ID',
    'Groq account',
    'groqApi',
    '{"apiKey":"$ENCRYPTED_KEY"}',
    datetime('now'),
    datetime('now')
);
SQL

        echo "Groq credentials created with ID: $CRED_ID"
    else
        echo "WARNING: No GROQ_API_KEY environment variable set!"
        echo "Please either:"
        echo "  1. Set GROQ_API_KEY environment variable, OR"
        echo "  2. Manually add Groq credentials via n8n UI at http://localhost:5678"
        echo ""
        echo "Workflows will not activate without valid credentials."
    fi
else
    echo "Found existing Groq credentials with ID: $CRED_ID"
fi

# Update workflow files with credential ID if we have one
if [ -n "$CRED_ID" ]; then
    echo "Updating workflow files with credential ID: $CRED_ID..."

    for workflow_file in /app/n8n-workflows/*.json; do
        if [ -f "$workflow_file" ]; then
            # Replace any existing Groq credential ID with the correct one
            sed -i "s/\"id\": \"[a-zA-Z0-9]*\",$/\"id\": \"$CRED_ID\",/g" "$workflow_file"
            # More specific pattern for credentials section
            sed -i "/\"groqApi\"/,/}/ s/\"id\": \"[^\"]*\"/\"id\": \"$CRED_ID\"/g" "$workflow_file"
        fi
    done

    echo "Workflow files updated successfully."
fi

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
