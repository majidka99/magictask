#!/bin/bash

# MajiTask Production Backup Script
# Updated for Phase 2 with MariaDB integration
# Generated: June 28, 2025

# Define variables
BACKUP=/var/backups/majitask_v1
TODAYDATE=$(date +"%Y%m%d")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
WEEKDAY=$(date +"%u")
LOG=/var/log/majitask_v1_backup.log
ADDRESS='majitask.fun@gmail.com'
ADDRESS_ALERT="majitask.fun@gmail.com"

# Application paths
APP_PATH="/home/apps/majitask_v1/majitask"
UPLOADS_PATH="${APP_PATH}/uploads"
LOGS_PATH="${APP_PATH}/logs"

# Database configuration (from .env.production)
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="majitask_v1"
DB_USER="majitask_v1"
DB_PASSWORD="majitask_secure_2024!"

# Backup retention (days)
RETENTION_DAYS=30

# Ensure backup directory exists
mkdir -p $BACKUP/{app,database,uploads,logs}

echo "=== Starting MajiTask_v1 backup - $(date +"%Y-%m-%d %H:%M:%S") ===" | tee -a $LOG

# Function to log messages
log_message() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a $LOG
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        log_message "SUCCESS: $1"
    else
        log_message "ERROR: $1 failed"
        echo "Backup failed: $1" | mail -s "MajiTask_v1 Backup Alert" $ADDRESS_ALERT
        exit 1
    fi
}

# Delete old backups (older than retention period)
log_message "Cleaning up old backups (older than ${RETENTION_DAYS} days)"
find $BACKUP -type f -name "*.tgz" -mtime +${RETENTION_DAYS} -delete
find $BACKUP -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
check_success "Old backup cleanup"

# Stop application gracefully for consistent backup
log_message "Stopping MajiTask_v1 application"
systemctl stop majitask_v1 2>/dev/null || true
sleep 5

# Backup database
log_message "Starting database backup"
mysqldump -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} \
    --single-transaction --routines --triggers \
    ${DB_NAME} | gzip > $BACKUP/database/majitask_v1_db_${TIMESTAMP}.sql.gz
check_success "Database backup"

# Backup application files (excluding node_modules, logs, and temp files)
log_message "Starting application files backup"
tar czf $BACKUP/app/majitask_v1_app_${TIMESTAMP}.tgz \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='uploads/temp' \
    -C /home/apps majitask_v1
check_success "Application files backup"

# Backup uploads directory separately
if [ -d "$UPLOADS_PATH" ]; then
    log_message "Starting uploads backup"
    tar czf $BACKUP/uploads/majitask_v1_uploads_${TIMESTAMP}.tgz -C ${APP_PATH} uploads
    check_success "Uploads backup"
fi

# Backup logs directory
if [ -d "$LOGS_PATH" ]; then
    log_message "Starting logs backup"
    tar czf $BACKUP/logs/majitask_v1_logs_${TIMESTAMP}.tgz -C ${APP_PATH} logs
    check_success "Logs backup"
fi

# Backup configuration files
log_message "Starting configuration backup"
tar czf $BACKUP/majitask_v1_config_${TIMESTAMP}.tgz \
    /etc/systemd/system/majitask_v1.service \
    /etc/nginx/sites-available/majitask_v1* \
    /etc/letsencrypt/live/app.majitask.fun/ \
    2>/dev/null || true

# Restart application
log_message "Restarting MajiTask_v1 application"
systemctl start majitask_v1
sleep 10

# Verify application is running
if systemctl is-active --quiet majitask_v1; then
    log_message "MajiTask_v1 application restarted successfully"
else
    log_message "ERROR: MajiTask_v1 application failed to restart"
    echo "MajiTask_v1 failed to restart after backup" | mail -s "MajiTask_v1 Critical Alert" $ADDRESS_ALERT
fi

# Generate backup report
BACKUP_SIZE=$(du -sh $BACKUP | cut -f1)
log_message "Backup completed successfully"
log_message "Total backup size: $BACKUP_SIZE"

# Email backup report
{
    echo "MajiTask_v1 Backup Report"
    echo "========================="
    echo "Date: $(date)"
    echo "Backup Location: $BACKUP"
    echo "Total Size: $BACKUP_SIZE"
    echo ""
    echo "Backup Files Created:"
    echo "- Database: majitask_v1_db_${TIMESTAMP}.sql.gz"
    echo "- Application: majitask_v1_app_${TIMESTAMP}.tgz"
    echo "- Uploads: majitask_v1_uploads_${TIMESTAMP}.tgz"
    echo "- Logs: majitask_v1_logs_${TIMESTAMP}.tgz"
    echo "- Config: majitask_v1_config_${TIMESTAMP}.tgz"
    echo ""
    echo "Application Status: $(systemctl is-active majitask_v1)"
    echo ""
    echo "Backup completed successfully at $(date)"
} | mail -s "MajiTask_v1 Backup Report - $TODAYDATE" $ADDRESS

log_message "=== Backup process completed ==="
# systemctl start mariadb
# systemctl start php*-fpm
# systemctl start nginx

echo "Backup of MajiTask_v1 App finished on $(date +"%Y%m%d - %T")"

# Prepare log and email notification
echo "From: majitask_v1@majitask.fun" > $LOG
echo "To: $ADDRESS" >> $LOG
echo "Subject: MajiTask_v1 App Backup on ${TODAYDATE}" >> $LOG
echo "" >> $LOG
echo "$(date +"%Y%m%d - %T") - MajiTask_v1 backup completed." >> $LOG
echo "" >> $LOG

df -h >> $LOG
echo "" >> $LOG
echo "Last MajiTask_v1 backups:" >> $LOG
ls -lsht $BACKUP/backup_majitask_v1_* | head -3 >> $LOG
echo "" >> $LOG
echo "Backup completed successfully. Have a nice day." >> $LOG

# Send the email using sendmail
cat $LOG | /usr/sbin/sendmail -f majitask_v1@majitask.fun $ADDRESS

# Archive the log file
mv $LOG /var/log/serverbackup/serverbackup_majitask_v1_${TODAYDATE}.log

exit 0
