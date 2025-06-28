# MajiTask Production Deployment Guide

## 🚀 Production Environment Setup

This guide provides step-by-step instructions for deploying MajiTask in a production environment with the Phase 2 backend integration.

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **Node.js**: 18.x or higher
- **MariaDB**: 10.5+ 
- **Nginx**: 1.18+ (for reverse proxy)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB, recommended 50GB+
- **Network**: Static IP address and domain name

### Required Services
- MariaDB server configured and running
- Nginx web server
- SSL certificate (Let's Encrypt recommended)
- Email server (SMTP) for notifications
- UFW firewall configured

## 🔧 Quick Deployment

### Option 1: Automated Deployment
```bash
# Navigate to application directory
cd /home/apps/majitask_v1/majitask

# Run automated deployment script
sudo ./deploy-production.sh

# Verify deployment
./verify-production.sh
```

### Option 2: Manual Deployment
Follow the detailed steps below for manual deployment.

## 📝 Detailed Deployment Steps

### 1. Environment Configuration

```bash
# Copy production environment template
cd /home/apps/majitask_v1/majitask
cp .env.production .env

# Edit configuration values (if needed)
nano .env
```

**Critical Environment Variables to Verify:**
```bash
# Database
DB_HOST=127.0.0.1
DB_USER=majitask_v1
DB_PASSWORD=majitask_secure_2024!
DB_NAME=majitask_v1

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-2024-v3-majitask-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-2024-v3-majitask-production

# Email
SMTP_PASSWORD=ebhmakqlmxjwspnk
FROM_EMAIL=majitask.fun@gmail.com

# Production URLs
API_BASE_URL=https://app.majitask.fun
VITE_API_BASE_URL=https://app.majitask.fun
```

### 2. Database Setup

```bash
# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE majitask_v1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'majitask_v1'@'localhost' IDENTIFIED BY 'majitask_secure_2024!';
GRANT ALL PRIVILEGES ON majitask_v1.* TO 'majitask_v1'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Run database migrations
npm run migrate:all
```

### 3. Application Dependencies

```bash
# Install production dependencies
npm ci --only=production

# Build application (if needed)
npm run build
```

### 4. System Service Configuration

```bash
# Create systemd service
sudo nano /etc/systemd/system/majitask_v1.service
```

```ini
[Unit]
Description=MajiTask_v1 Application
Documentation=https://github.com/majitask/majitask
After=network.target mariadb.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/home/apps/majitask_v1/majitask
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
ExecReload=/bin/kill -HUP $MAINPID
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
ReadWritePaths=/home/apps/majitask_v1/majitask
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable majitask_v1
sudo systemctl start majitask_v1

# Check status
sudo systemctl status majitask_v1
```

### 5. Nginx Configuration

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/majitask
```

```nginx
server {
    listen 80;
    server_name app.majitask.fun;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.majitask.fun;

    ssl_certificate /etc/letsencrypt/live/app.majitask.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.majitask.fun/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Serve static files
    location / {
        root /home/apps/majitask_v1/majitask/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3863;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    location /uploads {
        alias /home/apps/majitask_v1/majitask/uploads;
        expires 1M;
        add_header Cache-Control "public";
    }

    # Security - deny access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.(env|log)$ {
        deny all;
    }
}
```

```bash
# Enable site and restart nginx
sudo ln -s /etc/nginx/sites-available/majitask /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Backup System Deployment

```bash
# Deploy backup system using Ansible
cd /home/apps/majitask_v1/ansible
ansible-playbook 08_deploying_backup.yaml
```

Or manually:

```bash
# Create backup directories
sudo mkdir -p /var/backups/majitask/{app,database,uploads,logs}
sudo mkdir -p /root/bin

# Copy backup script
sudo cp /home/apps/majitask_v1/ansible/files/server/server_backup.sh /root/bin/
sudo chmod +x /root/bin/server_backup.sh

# Install crontab
sudo cp /home/apps/majitask_v1/ansible/files/server/crontab /etc/cron.d/majitask_maintenance
```

### 7. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3863/tcp  # Block direct access to Node.js
sudo ufw enable
```

### 8. SSL Certificate Setup

```bash
# Install Let's Encrypt certificate
sudo certbot --nginx -d app.majitask.fun

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🧪 Testing and Verification

### 1. Application Health Check
```bash
# Run verification script
./verify-production.sh

# Manual health check
curl -I https://app.majitask.fun/api/health
```

### 2. Database Connectivity
```bash
mysql -h127.0.0.1 -umajitask -pmajitask_secure_2024! -e "SELECT 1" majitask
```

### 3. Service Status
```bash
sudo systemctl status majitask
sudo systemctl status nginx
sudo systemctl status mariadb
```

### 4. Log Monitoring
```bash
# Application logs
journalctl -u majitask -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Backup logs
tail -f /var/log/majitask_backup.log
```

## 📊 Monitoring and Maintenance

### Daily Tasks
- Check application status: `npm run status`
- Review error logs: `npm run logs:app`
- Monitor backup logs: `npm run logs:backup`

### Weekly Tasks
- Review backup success: Check `/var/log/majitask_backup.log`
- Check disk space: `df -h`
- Review security logs: `journalctl -u ssh`

### Monthly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review SSL certificate expiry: `sudo certbot certificates`
- Database optimization: Review slow query logs

## 🔧 Production Scripts

### Useful Commands
```bash
# Deploy to production
npm run deploy:prod

# Verify production setup
npm run verify:prod

# Manual backup
npm run backup:now

# View application logs
npm run logs:app

# View backup logs
npm run logs:backup

# Check service status
npm run status

# Restart application
npm run restart
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
journalctl -u majitask -n 50

# Verify database connection
mysql -h127.0.0.1 -umajitask -pmajitask_secure_2024! majitask

# Check environment file
cat /home/apps/majitask_v1/majitask/.env
```

#### Database Connection Issues
```bash
# Check MariaDB status
sudo systemctl status mariadb

# Verify user permissions
mysql -u root -p -e "SHOW GRANTS FOR 'majitask'@'localhost';"

# Test connection manually
mysql -h127.0.0.1 -umajitask -pmajitask_secure_2024! majitask
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Verify nginx configuration
sudo nginx -t
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart application if needed
sudo systemctl restart majitask
```

## 📞 Support and Monitoring

### Log Files Locations
- Application logs: `/home/apps/majitask_v1/majitask/logs/`
- System logs: `journalctl -u majitask`
- Nginx logs: `/var/log/nginx/`
- Backup logs: `/var/log/majitask_backup.log`
- Health check logs: `/var/log/majitask_health.log`

### Emergency Contacts
- Email alerts are sent to: `majitask.fun@gmail.com`
- Check `/var/log/mail.log` for email delivery issues

### Performance Monitoring
- Application health: `https://app.majitask.fun/api/health`
- System metrics: `htop`, `iotop`, `nethogs`
- Database performance: Slow query log analysis

---

**Production Deployment Status**: ✅ Ready for deployment  
**Last Updated**: June 28, 2025  
**Environment**: Production  
**Version**: Phase 2 with backend integration
