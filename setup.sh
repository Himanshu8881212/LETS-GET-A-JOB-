#!/bin/bash

# LETS GET A JOB - Setup Script
# This script sets up n8n workflows

set -e

echo ""
echo "========================================="
echo "   LETS GET A JOB - Setup"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✓ Docker installed"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
echo "✓ Node.js installed"

# Check if n8n is running
if ! curl -sf http://localhost:5679/healthz > /dev/null 2>&1; then
    echo ""
    echo "⚠️  n8n is not running. Starting n8n..."
    docker-compose --profile n8n up -d
    echo "⏳ Waiting 30 seconds for n8n to start..."
    sleep 30
fi

echo "✓ n8n is running"
echo ""

# Run the main setup script
echo "Running workflow setup..."
echo ""
node setup-n8n-workflows.js

echo ""
echo "========================================="
echo "   Setup Complete!"
echo "========================================="
echo ""
echo "Next: Start the app with:"
echo "  docker-compose --profile app up -d --build"
echo ""
