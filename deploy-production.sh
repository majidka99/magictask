#!/bin/bash

# MajiTask_v1 Production Environment Deployment Script
# This script deploys the production environment configuration
# Generated: June 28, 2025

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_PATH="/home/apps/majitask_v1/majitask"
BACKUP_PATH="/var/backups/majitask_v1"
CURRENT_USER=$(whoami)

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check if MariaDB is installed and running
    if ! systemctl is-active --quiet mariadb; then
        log_warn "MariaDB is not running. Starting MariaDB..."
        systemctl start mariadb || {
            log_error "Failed to start MariaDB"
            exit 1
        }
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    log_info "System requirements check completed"
}

deploy_environment() {
    log_info "Deploying production environment configuration..."
    
    # Backup existing .env if it exists
    if [ -f "$APP_PATH/.env" ]; then
        log_info "Backing up existing .env file"
        cp "$APP_PATH/.env" "$APP_PATH/.env.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy production environment file
    if [ -f "$APP_PATH/.env.production" ]; then
        log_info "Copying .env.production to .env"
        cp "$APP_PATH/.env.production" "$APP_PATH/.env"
        chmod 600 "$APP_PATH/.env"
        chown www-data:www-data "$APP_PATH/.env"
    else
        log_error ".env.production file not found at $APP_PATH/.env.production"
        exit 1
    fi
    
    log_info "Environment configuration deployed successfully"
}

setup_database() {
    log_info "Setting up database..."
    
    # Check if database exists
    DB_EXISTS=$(mysql -h127.0.0.1 -umajitask_v1 -pmajitask_secure_2024! -e "SHOW DATABASES LIKE 'majitask_v1';" | wc -l)
    
    if [ "$DB_EXISTS" -eq 0 ]; then
        log_info "Creating majitask_v1 database..."
        mysql -h127.0.0.1 -uroot -e "CREATE DATABASE majitask_v1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        mysql -h127.0.0.1 -uroot -e "GRANT ALL PRIVILEGES ON majitask_v1.* TO 'majitask_v1'@'localhost';"
        mysql -h127.0.0.1 -uroot -e "FLUSH PRIVILEGES;"
    else
        log_info "Database 'majitask_v1' already exists"
    fi
    
    # Run migrations
    log_info "Running database migrations..."
    cd "$APP_PATH"
    npm run migrate || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_info "Database setup completed"
}

setup_directories() {
    log_info "Setting up application directories..."
    
    # Create necessary directories
    mkdir -p "$APP_PATH"/{logs,uploads,uploads/temp}
    mkdir -p "$BACKUP_PATH"/{app,database,uploads,logs}
    
    # Set proper permissions
    chown -R www-data:www-data "$APP_PATH"/{logs,uploads}
    chmod -R 755 "$APP_PATH"/{logs,uploads}
    
    # Set backup directory permissions
    chown -R root:root "$BACKUP_PATH"
    chmod -R 755 "$BACKUP_PATH"
    
    log_info "Directories setup completed"
}

install_dependencies() {
    log_info "Installing application dependencies..."
    
    cd "$APP_PATH"
    
    # Install production dependencies
    npm ci --only=production || {
        log_error "Failed to install dependencies"
        exit 1
    }
    
    # Build application if needed
    if [ -f "package.json" ] && grep -q "build" package.json; then
        log_info "Building application..."
        npm run build || {
            log_error "Application build failed"
            exit 1
        }
    fi
    
    log_info "Dependencies installation completed"
}

configure_systemd() {
    log_info "Configuring systemd service..."
    
    # Create systemd service file
    cat > /etc/systemd/system/majitask_v1.service << EOF
[Unit]
Description=MajiTask_v1 Application
Documentation=https://github.com/majitask/majitask
After=network.target mariadb.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_PATH
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=majitask_v1

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$APP_PATH
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable majitask_v1
    
    log_info "Systemd service configured"
}

start_application() {
    log_info "Starting MajiTask_v1 application..."
    
    # Stop service if running
    if systemctl is-active --quiet majitask_v1; then
        log_info "Stopping existing MajiTask_v1 service..."
        systemctl stop majitask_v1
        sleep 5
    fi
    
    # Start the service
    systemctl start majitask_v1
    
    # Wait a moment and check status
    sleep 10
    
    if systemctl is-active --quiet majitask_v1; then
        log_info "MajiTask_v1 application started successfully"
        
        # Show service status
        systemctl status majitask_v1 --no-pager -l
    else
        log_error "Failed to start MajiTask_v1 application"
        log_error "Check logs with: journalctl -u majitask_v1 -f"
        exit 1
    fi
}

run_health_check() {
    log_info "Running health check..."
    
    # Wait for application to be ready
    sleep 15
    
    # Check if application is responding
    if curl -f -s http://localhost:3863/api/health > /dev/null 2>&1; then
        log_info "Health check passed - application is responding"
    else
        log_warn "Health check failed - application may not be fully ready"
        log_info "Check application logs: journalctl -u majitask -f"
    fi
}

main() {
    log_info "Starting MajiTask_v1 production deployment..."
    
    check_requirements
    deploy_environment
    setup_directories
    install_dependencies
    setup_database
    configure_systemd
    start_application
    run_health_check
    
    log_info "=== Deployment completed successfully ==="
    log_info "Application URL: https://app.majitask.fun"
    log_info "Service status: systemctl status majitask_v1"
    log_info "Application logs: journalctl -u majitask_v1 -f"
    log_info "Backup logs: tail -f /var/log/majitask_v1_backup.log"
}

# Run main function
main "$@"
