#!/bin/bash

# Nadar Docker Setup Script
# This script helps set up Nadar with Docker for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create .env file if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Nadar Environment Configuration
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
GEMINI_TIMEOUT_MS=30000
GEMINI_TTS_TIMEOUT_MS=20000
GRAFANA_PASSWORD=admin
ACME_EMAIL=admin@example.com
EOF
        print_warning "Please edit .env file with your actual API keys"
        print_warning "You can get Gemini API key from: https://aistudio.google.com/app/apikey"
        print_warning "You can get ElevenLabs API key from: https://elevenlabs.io/app/settings/api-keys"
    else
        print_success ".env file already exists"
    fi
}

# Development setup
setup_dev() {
    print_status "Setting up development environment..."
    setup_env
    
    print_status "Building development containers..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
    
    print_status "Starting development services..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    
    print_success "Development environment is ready!"
    print_status "Server: http://localhost:4000"
    print_status "App: http://localhost:3000"
    print_status "Logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
}

# Production setup
setup_prod() {
    print_status "Setting up production environment..."
    setup_env
    
    # Check if API keys are set
    if grep -q "your_.*_api_key_here" .env; then
        print_error "Please set your API keys in .env file before running production setup"
        exit 1
    fi
    
    print_status "Building production containers..."
    docker-compose build
    
    print_status "Starting production services..."
    docker-compose up -d
    
    print_success "Production environment is ready!"
    print_status "Server: http://localhost:4000"
    print_status "App: http://localhost:3000"
    print_status "Health check: curl http://localhost:4000/health"
}

# Setup with monitoring
setup_monitoring() {
    print_status "Setting up with monitoring..."
    setup_env
    
    print_status "Building containers with monitoring..."
    docker-compose --profile monitoring build
    
    print_status "Starting services with monitoring..."
    docker-compose --profile monitoring up -d
    
    print_success "Environment with monitoring is ready!"
    print_status "Server: http://localhost:4000"
    print_status "App: http://localhost:3000"
    print_status "Prometheus: http://localhost:9090"
    print_status "Grafana: http://localhost:3001 (admin/admin)"
}

# Setup with scaling (Redis)
setup_scaling() {
    print_status "Setting up with scaling support..."
    setup_env
    
    print_status "Building containers with Redis..."
    docker-compose --profile scaling build
    
    print_status "Starting services with Redis..."
    docker-compose --profile scaling up -d
    
    print_success "Environment with scaling support is ready!"
    print_status "Server: http://localhost:4000"
    print_status "App: http://localhost:3000"
    print_status "Redis: localhost:6379"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans
    
    # Remove images
    docker images | grep nadar | awk '{print $3}' | xargs -r docker rmi
    
    # Remove volumes (optional)
    read -p "Remove volumes (this will delete all data)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    print_success "Cleanup completed"
}

# Show logs
show_logs() {
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Show status
show_status() {
    print_status "Docker containers status:"
    docker-compose ps
    
    print_status "Health checks:"
    curl -s http://localhost:4000/health && echo " - Server: OK" || echo " - Server: FAIL"
    curl -s http://localhost:3000/health && echo " - App: OK" || echo " - App: FAIL"
}

# Main menu
show_help() {
    echo "Nadar Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Setup development environment"
    echo "  prod        Setup production environment"
    echo "  monitoring  Setup with monitoring (Prometheus + Grafana)"
    echo "  scaling     Setup with scaling support (Redis)"
    echo "  logs [dev]  Show logs (add 'dev' for development logs)"
    echo "  status      Show container status and health"
    echo "  cleanup     Stop containers and cleanup resources"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Start development environment"
    echo "  $0 prod     # Start production environment"
    echo "  $0 logs     # Show production logs"
    echo "  $0 logs dev # Show development logs"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        "dev")
            setup_dev
            ;;
        "prod")
            setup_prod
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "scaling")
            setup_scaling
            ;;
        "logs")
            show_logs "$2"
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
