#!/bin/bash

# Sunoo Backend Docker Setup Script
# This script helps you set up and manage the Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to create .env.docker file
create_env_file() {
    if [ ! -f .env.docker ]; then
        print_status "Creating .env.docker file from template..."
        cp env.docker.example .env.docker
        print_success ".env.docker file created"
        print_warning "Please update .env.docker with your actual configuration values"
    else
        print_status ".env.docker file already exists"
    fi
}

# Function to start Docker services
start_services() {
    print_status "Starting Docker services..."
    docker-compose -f docker-compose.dev.yml up -d
    print_success "Docker services started"
}

# Function to stop Docker services
stop_services() {
    print_status "Stopping Docker services..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Docker services stopped"
}

# Function to show service status
show_status() {
    print_status "Docker services status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to show logs
show_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker-compose -f docker-compose.dev.yml logs -f "$service"
    else
        print_status "Showing logs for all services..."
        docker-compose -f docker-compose.dev.yml logs -f
    fi
}

# Function to reset database
reset_database() {
    print_warning "This will remove all data in the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Stopping services..."
        docker-compose -f docker-compose.dev.yml down
        print_status "Removing database volume..."
        docker volume rm sunoo-backend_postgres_dev_data 2>/dev/null || true
        print_status "Starting services..."
        docker-compose -f docker-compose.dev.yml up -d
        print_success "Database reset complete"
    else
        print_status "Database reset cancelled"
    fi
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    npm run migration:run
    print_success "Migrations completed"
}

# Function to run backup migration
run_backup_migration() {
    print_status "Running backup data migration..."
    npm run migrate:json
    print_success "Backup migration completed"
}

# Function to show help
show_help() {
    echo "Sunoo Backend Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up Docker environment (create .env.docker, start services)"
    echo "  start     - Start Docker services"
    echo "  stop      - Stop Docker services"
    echo "  restart   - Restart Docker services"
    echo "  status    - Show service status"
    echo "  logs      - Show logs (optionally specify service name)"
    echo "  reset-db  - Reset database (removes all data)"
    echo "  migrate   - Run database migrations"
    echo "  migrate-backup - Run backup data migration"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 logs postgres"
    echo "  $0 migrate"
}

# Main script logic
case "${1:-help}" in
    setup)
        check_docker
        create_env_file
        start_services
        print_success "Setup complete!"
        print_status "You can now:"
        print_status "1. Update .env.docker with your configuration"
        print_status "2. Run migrations: $0 migrate"
        print_status "3. Run backup migration: $0 migrate-backup"
        print_status "4. Access pgAdmin at http://localhost:5050"
        ;;
    start)
        check_docker
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    reset-db)
        check_docker
        reset_database
        ;;
    migrate)
        run_migrations
        ;;
    migrate-backup)
        run_backup_migration
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
