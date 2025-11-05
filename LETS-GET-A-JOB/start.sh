#!/bin/bash

# LETS-GET-A-JOB Quick Start Script
# This script helps you quickly start the application with Docker

set -e

echo "========================================="
echo "  LETS GET A JOB - Quick Start"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

# Determine docker-compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if containers are already running
if docker ps | grep -q "lets-get-a-job-all-in-one"; then
    echo "⚠️  Container is already running!"
    echo ""
    echo "Choose an option:"
    echo "  1) Restart the container"
    echo "  2) Stop the container"
    echo "  3) View logs"
    echo "  4) Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            echo "🔄 Restarting container..."
            docker restart lets-get-a-job-all-in-one
            ;;
        2)
            echo "🛑 Stopping container..."
            $DOCKER_COMPOSE down
            echo "✅ Container stopped"
            exit 0
            ;;
        3)
            echo "📋 Showing logs (Ctrl+C to exit)..."
            docker logs -f lets-get-a-job-all-in-one
            exit 0
            ;;
        4)
            exit 0
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
else
    echo "🚀 Starting LETS-GET-A-JOB application..."
    echo ""
    
    # Build and start containers
    $DOCKER_COMPOSE up -d --build
    
    echo ""
    echo "⏳ Waiting for services to initialize (this may take 1-2 minutes)..."
    sleep 30
    
    # Check if container is running
    if docker ps | grep -q "lets-get-a-job-all-in-one"; then
        echo ""
        echo "========================================="
        echo "  ✅ Application Started Successfully!"
        echo "========================================="
        echo ""
        echo "📱 Access the application:"
        echo "   • Main App:  http://localhost:3000"
        echo "   • n8n:       http://localhost:5678"
        echo ""
        echo "🔐 n8n Login Credentials:"
        echo "   • Email:    admin@localhost"
        echo "   • Password: admin123"
        echo ""
        echo "⚠️  IMPORTANT: Activate n8n Workflows"
        echo "   1. Open http://localhost:5678"
        echo "   2. Login with the credentials above"
        echo "   3. Click 'Workflows' in the sidebar"
        echo "   4. Activate all 4 workflows by clicking the toggle"
        echo ""
        echo "📋 Useful Commands:"
        echo "   • View logs:    docker logs -f lets-get-a-job-all-in-one"
        echo "   • Stop app:     $DOCKER_COMPOSE down"
        echo "   • Restart app:  docker restart lets-get-a-job-all-in-one"
        echo ""
        echo "📖 For more information, see README.md"
        echo "========================================="
    else
        echo ""
        echo "❌ Error: Container failed to start"
        echo "Check logs with: docker logs lets-get-a-job-all-in-one"
        exit 1
    fi
fi

