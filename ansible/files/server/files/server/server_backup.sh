#!/bin/bash

# Define variables
BACKUP=/archive/backup/majitask
TODAYDATE=$(date +"%Y%m%d")
WEEKDAY=$(date +"%u")
LOG=/var/log/serverbackup.log
ADDRESS='majitask.app@gmail.com'  # Update with your email
ADDRESS_ALERT="majitask.app@gmail.com"  # Update with your email

# Ensure backup directory exists
mkdir -p $BACKUP

echo "Starting backup of Majitask App - $(date +"%Y%m%d - %T")"

# Delete Majitask backups older than 7 days
find $BACKUP -maxdepth 1 -type f -name "*.tgz" -mtime +7 -delete

# Optionally: stop services for a consistent backup
# systemctl stop nginx
# systemctl stop php*-fpm
# systemctl stop mariadb  # If your app uses MariaDB

# Create a backup archive of the Majitask installation and data
tar czf $BACKUP/backup_majitask_${TODAYDATE}.tgz /home/apps/majitask

# Optionally: backup database if your app uses one
# mysqldump -u majitask_user -p'your_db_password' majitask_db > $BACKUP/majitask_db_${TODAYDATE}.sql

# Optionally: restart services if they were stopped
# systemctl start mariadb
# systemctl start php*-fpm
# systemctl start nginx

echo "Backup of Majitask App finished on $(date +"%Y%m%d - %T")"

# Prepare log and email notification
echo "From: majitask.app@gmail.com" > $LOG
echo "To: $ADDRESS" >> $LOG
echo "Subject: Majitask App Backup on ${TODAYDATE}" >> $LOG
echo "" >> $LOG
echo "$(date +"%Y%m%d - %T") - Majitask backup completed." >> $LOG
echo "" >> $LOG

df -h >> $LOG
echo "" >> $LOG
echo "Last Majitask backups:" >> $LOG
ls -lsht $BACKUP/backup_majitask_* | head -3 >> $LOG
echo "" >> $LOG
echo "Backup completed successfully. Have a nice day." >> $LOG

# Send the email using sendmail
cat $LOG | /usr/sbin/sendmail -f majitask.app@gmail.com $ADDRESS

# Archive the log file
mv $LOG /var/log/serverbackup/serverbackup_${TODAYDATE}.log

exit 0
