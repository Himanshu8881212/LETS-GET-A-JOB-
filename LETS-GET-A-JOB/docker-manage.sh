#!/bin/bash

# Docker Management Script for LETS-GET-A-JOB
# Provides easy commands to manage the Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
}

# Show usage
show_usage() {
    print_header "LETS-GET-A-JOB Docker Management"
    echo ""
    echo "Usage: ./docker-manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start         - Start all services"
    echo "  stop          - Stop all services"
    echo "  restart       - Restart all services"
    echo "  status        - Show service status"
    echo "  logs          - Show logs (all services)"
    echo "  logs-app      - Show Next.js app logs"
    echo "  logs-n8n      - Show n8n logs"
    echo "  build         - Rebuild and start services"
    echo "  clean         - Stop and remove containers (keeps data)"
    echo "  reset         - Reset everything (WARNING: deletes all data)"
    echo "  backup        - Backup all data"
    echo "  restore       - Restore data from backup"
    echo "  health        - Check service health"
    echo "  shell-app     - Open shell in Next.js container"
    echo "  shell-n8n     - Open shell in n8n container"
    echo "  test          - Test n8n webhooks"
    echo "  help          - Show this help message"
    echo ""
}

# Start services
start_services() {
    print_header "Starting Services"
    check_docker
    docker-compose up -d
    print_success "Services started!"
    echo ""
    print_info "Application: http://localhost:3000"
    print_info "n8n Dashboard: http://localhost:5678"
    echo ""
    print_info "Run './docker-manage.sh status' to check service status"
}

# Stop services
stop_services() {
    print_header "Stopping Services"
    check_docker
    docker-compose stop
    print_success "Services stopped!"
}

# Restart services
restart_services() {
    print_header "Restarting Services"
    check_docker
    docker-compose restart
    print_success "Services restarted!"
}

# Show status
show_status() {
    print_header "Service Status"
    check_docker
    docker-compose ps
}

# Show logs
show_logs() {
    print_header "Service Logs (Press Ctrl+C to exit)"
    check_docker
    docker-compose logs -f
}

# Show app logs
show_app_logs() {
    print_header "Next.js Application Logs (Press Ctrl+C to exit)"
    check_docker
    docker-compose logs -f app
}

# Show n8n logs
show_n8n_logs() {
    print_header "n8n Logs (Press Ctrl+C to exit)"
    check_docker
    docker-compose logs -f n8n
}

# Build services
build_services() {
    print_header "Building Services"
    check_docker
    print_info "This may take a few minutes..."
    docker-compose build --no-cache
    docker-compose up -d
    print_success "Services built and started!"
}

# Clean containers
clean_containers() {
    print_header "Cleaning Containers"
    check_docker
    print_warning "This will stop and remove containers but keep your data."
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down
        print_success "Containers removed!"
    else
        print_info "Cancelled."
    fi
}

# Reset everything
reset_everything() {
    print_header "Reset Everything"
    check_docker
    print_error "WARNING: This will delete ALL data including:"
    echo "  - All resumes and cover letters"
    echo "  - All job applications"
    echo "  - All n8n workflows and execution history"
    echo ""
    read -p "Are you ABSOLUTELY sure? Type 'yes' to confirm: " -r
    echo
    if [[ $REPLY == "yes" ]]; then
        docker-compose down -v
        print_success "Everything reset!"
        print_info "Run './docker-manage.sh start' to start fresh"
    else
        print_info "Cancelled."
    fi
}

# Backup data
backup_data() {
    print_header "Backing Up Data"
    check_docker
    
    BACKUP_DIR="backups"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    print_info "Backing up application data..."
    docker run --rm \
        -v lets-get-a-job_app_data:/data \
        -v "$(pwd)/$BACKUP_DIR:/backup" \
        alpine tar czf "/backup/app-data-$TIMESTAMP.tar.gz" -C /data .
    
    print_info "Backing up n8n data..."
    docker run --rm \
        -v lets-get-a-job_n8n_data:/data \
        -v "$(pwd)/$BACKUP_DIR:/backup" \
        alpine tar czf "/backup/n8n-data-$TIMESTAMP.tar.gz" -C /data .
    
    print_success "Backup complete!"
    echo ""
    print_info "Backup files:"
    ls -lh "$BACKUP_DIR"/*-$TIMESTAMP.tar.gz
}

# Restore data
restore_data() {
    print_header "Restoring Data"
    check_docker
    
    BACKUP_DIR="backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backups found!"
        exit 1
    fi
    
    echo "Available backups:"
    ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null || {
        print_error "No backup files found!"
        exit 1
    }
    echo ""
    
    read -p "Enter backup timestamp (YYYYMMDD-HHMMSS): " TIMESTAMP
    
    APP_BACKUP="$BACKUP_DIR/app-data-$TIMESTAMP.tar.gz"
    N8N_BACKUP="$BACKUP_DIR/n8n-data-$TIMESTAMP.tar.gz"
    
    if [ ! -f "$APP_BACKUP" ] || [ ! -f "$N8N_BACKUP" ]; then
        print_error "Backup files not found for timestamp: $TIMESTAMP"
        exit 1
    fi
    
    print_warning "This will replace current data with backup from $TIMESTAMP"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping services..."
        docker-compose down
        
        print_info "Restoring application data..."
        docker run --rm \
            -v lets-get-a-job_app_data:/data \
            -v "$(pwd)/$BACKUP_DIR:/backup" \
            alpine sh -c "cd /data && tar xzf /backup/app-data-$TIMESTAMP.tar.gz"
        
        print_info "Restoring n8n data..."
        docker run --rm \
            -v lets-get-a-job_n8n_data:/data \
            -v "$(pwd)/$BACKUP_DIR:/backup" \
            alpine sh -c "cd /data && tar xzf /backup/n8n-data-$TIMESTAMP.tar.gz"
        
        print_info "Starting services..."
        docker-compose up -d
        
        print_success "Restore complete!"
    else
        print_info "Cancelled."
    fi
}

# Check health
check_health() {
    print_header "Service Health Check"
    check_docker
    
    echo ""
    print_info "Checking Next.js app..."
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Next.js app is healthy"
        curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/health
    else
        print_error "Next.js app is not responding"
    fi
    
    echo ""
    print_info "Checking n8n..."
    if curl -s http://localhost:5678/healthz > /dev/null; then
        print_success "n8n is healthy"
    else
        print_error "n8n is not responding"
    fi
    echo ""
}

# Open shell in app container
shell_app() {
    print_header "Opening Shell in Next.js Container"
    check_docker
    docker-compose exec app sh
}

# Open shell in n8n container
shell_n8n() {
    print_header "Opening Shell in n8n Container"
    check_docker
    docker-compose exec n8n sh
}

# Test webhooks
test_webhooks() {
    print_header "Testing n8n Webhooks"
    check_docker
    
    print_info "Testing Job Description Processing..."
    curl -X POST http://localhost:5678/webhook/process-jd \
        -H "Content-Type: application/json" \
        -d '{"jobUrl":"https://www.linkedin.com/jobs/view/3901234567"}' \
        -w "\nHTTP Status: %{http_code}\n"
    
    echo ""
    print_info "Testing ATS Evaluation..."
    curl -X POST http://localhost:5678/webhook/evaluate-ats \
        -H "Content-Type: application/json" \
        -d '{
            "resume_text": "Software Engineer with 5 years of React experience",
            "cover_letter_text": "I am excited to apply for this position",
            "job_description": "Looking for a Software Engineer with React experience"
        }' \
        -w "\nHTTP Status: %{http_code}\n"
    
    echo ""
}

# Main script
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    logs-app)
        show_app_logs
        ;;
    logs-n8n)
        show_n8n_logs
        ;;
    build)
        build_services
        ;;
    clean)
        clean_containers
        ;;
    reset)
        reset_everything
        ;;
    backup)
        backup_data
        ;;
    restore)
        restore_data
        ;;
    health)
        check_health
        ;;
    shell-app)
        shell_app
        ;;
    shell-n8n)
        shell_n8n
        ;;
    test)
        test_webhooks
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

