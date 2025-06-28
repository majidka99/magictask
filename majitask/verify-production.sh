#!/bin/bash

# MajiTask_v1 Production Environment Verification Script
# This script verifies the production environment setup
# Generated: June 28, 2025

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PATH="/home/apps/majitask_v1/majitask"
API_URL="http://localhost:3863"

# Functions
log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

check_environment_file() {
    log_header "Environment Configuration Check"
    
    if [ -f "$APP_PATH/.env" ]; then
        log_info "Environment file exists"
        
        # Check critical environment variables
        if grep -q "NODE_ENV=production" "$APP_PATH/.env"; then
            log_info "NODE_ENV set to production"
        else
            log_warn "NODE_ENV is not set to production"
        fi
        
        if grep -q "DB_PASSWORD=majitask_secure_2024!" "$APP_PATH/.env"; then
            log_info "Database password configured"
        else
            log_warn "Database password not found or different"
        fi
        
        if grep -q "JWT_SECRET=" "$APP_PATH/.env"; then
            log_info "JWT secret configured"
        else
            log_error "JWT secret not configured"
        fi
        
    else
        log_error "Environment file not found at $APP_PATH/.env"
    fi
}

check_database_connectivity() {
    log_header "Database Connectivity Check"
    
    if command -v mysql &> /dev/null; then
        if mysql -h127.0.0.1 -umajitask_v1 -pmajitask_secure_2024! -e "SELECT 1" majitask_v1 &> /dev/null; then
            log_info "Database connection successful"
            
            # Check if tables exist
            TABLE_COUNT=$(mysql -h127.0.0.1 -umajitask_v1 -pmajitask_secure_2024! -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'majitask_v1'" | tail -1)
            log_info "Database has $TABLE_COUNT tables"
            
        else
            log_error "Database connection failed"
        fi
    else
        log_warn "MySQL client not installed"
    fi
}

check_systemd_service() {
    log_header "Systemd Service Check"
    
    if [ -f "/etc/systemd/system/majitask_v1.service" ]; then
        log_info "Systemd service file exists"
        
        if systemctl is-enabled majitask_v1 &> /dev/null; then
            log_info "Service is enabled"
        else
            log_warn "Service is not enabled"
        fi
        
        if systemctl is-active --quiet majitask_v1; then
            log_info "Service is running"
        else
            log_warn "Service is not running"
        fi
        
    else
        log_error "Systemd service file not found"
    fi
}

check_application_health() {
    log_header "Application Health Check"
    
    if curl -f -s "$API_URL/api/health" &> /dev/null; then
        log_info "Application is responding to health checks"
    else
        log_warn "Application health check failed"
    fi
    
    # Check if app is listening on correct port
    if netstat -tlnp | grep -q ":3863"; then
        log_info "Application is listening on port 3863"
    else
        log_warn "Application is not listening on port 3863"
    fi
}

check_directories() {
    log_header "Directory Structure Check"
    
    DIRS=("$APP_PATH/logs" "$APP_PATH/uploads" "/var/backups/majitask_v1" "/root/bin")
    
    for dir in "${DIRS[@]}"; do
        if [ -d "$dir" ]; then
            log_info "Directory exists: $dir"
        else
            log_warn "Directory missing: $dir"
        fi
    done
}

check_backup_system() {
    log_header "Backup System Check"
    
    if [ -f "/root/bin/server_backup.sh" ]; then
        log_info "Backup script exists"
        
        if [ -x "/root/bin/server_backup.sh" ]; then
            log_info "Backup script is executable"
        else
            log_warn "Backup script is not executable"
        fi
    else
        log_error "Backup script not found"
    fi
    
    if [ -f "/etc/cron.d/majitask_v1_maintenance" ]; then
        log_info "Crontab file exists"
    else
        log_warn "Crontab file not found"
    fi
}

check_logs() {
    log_header "Log Files Check"
    
    LOG_FILES=("/var/log/majitask_v1_backup.log" "/var/log/majitask_v1_health.log" "$APP_PATH/logs/app.log")
    
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            log_info "Log file exists: $log_file"
        else
            log_warn "Log file missing: $log_file"
        fi
    done
    
    # Check for recent application logs
    if [ -f "$APP_PATH/logs/app.log" ]; then
        RECENT_LOGS=$(find "$APP_PATH/logs" -name "*.log" -mtime -1 | wc -l)
        log_info "Recent log files: $RECENT_LOGS"
    fi
}

check_security() {
    log_header "Security Configuration Check"
    
    # Check file permissions
    if [ -f "$APP_PATH/.env" ]; then
        PERM=$(stat -c "%a" "$APP_PATH/.env")
        if [ "$PERM" = "600" ]; then
            log_info "Environment file has secure permissions (600)"
        else
            log_warn "Environment file permissions: $PERM (should be 600)"
        fi
    fi
    
    # Check if firewall is active
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            log_info "UFW firewall is active"
        else
            log_warn "UFW firewall is not active"
        fi
    fi
}

generate_report() {
    log_header "System Information"
    
    echo -e "${BLUE}Hostname:${NC} $(hostname)"
    echo -e "${BLUE}OS:${NC} $(lsb_release -d | cut -f2)"
    echo -e "${BLUE}Node.js:${NC} $(node --version 2>/dev/null || echo 'Not installed')"
    echo -e "${BLUE}NPM:${NC} $(npm --version 2>/dev/null || echo 'Not installed')"
    echo -e "${BLUE}MariaDB:${NC} $(mysql --version 2>/dev/null | cut -d' ' -f6 || echo 'Not installed')"
    echo -e "${BLUE}Nginx:${NC} $(nginx -v 2>&1 | cut -d' ' -f3 || echo 'Not installed')"
    echo -e "${BLUE}Disk Usage:${NC} $(df -h / | tail -1 | awk '{print $5}')"
    echo -e "${BLUE}Memory Usage:${NC} $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo -e "${BLUE}Load Average:${NC} $(uptime | cut -d',' -f3-5)"
    echo -e "${BLUE}Uptime:${NC} $(uptime -p)"
}

main() {
    echo -e "${BLUE}MajiTask_v1 Production Environment Verification${NC}"
    echo -e "${BLUE}==============================================${NC}"
    echo ""
    
    check_environment_file
    echo ""
    
    check_database_connectivity
    echo ""
    
    check_systemd_service
    echo ""
    
    check_application_health
    echo ""
    
    check_directories
    echo ""
    
    check_backup_system
    echo ""
    
    check_logs
    echo ""
    
    check_security
    echo ""
    
    generate_report
    echo ""
    
    log_header "Verification Complete"
    echo "Review the output above for any warnings or errors."
    echo "For detailed logs, check: journalctl -u majitask_v1 -f"
}

# Run main function
main "$@"
