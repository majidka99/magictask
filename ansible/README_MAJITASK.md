# Majitask App - Ansible Server Setup

## Overview

This repository contains Ansible playbooks for setting up a complete server environment for the Majitask application on Ubuntu systems. The setup includes web server configuration, SSL certificates, security hardening, firewall, user management, and automated backups.

## Server Configuration

- **Domain:** app.majitask.fun
- **App Path:** /home/apps/majitask
- **Web Server:** Nginx (React SPA + Node.js API proxy)
- **Runtime:** Node.js 20.x with PM2 process manager
- **SSL:** Let's Encrypt (automatic)
- **Email:** Gmail SMTP (majitask.app@gmail.com)
- **Security:** UFW firewall + hardening

## Requirements

- **Supported OS:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- **Server:** Public IP address with SSH access
- **DNS:** Domain app.majitask.fun pointing to your server IP
- **SSH Key:** Configured for server access

## Quick Start

### 1. Configure Inventory

Edit `inventory.ini` and replace `YOUR_SERVER_IP` with your actual server IP:

```ini
[majitask_server]
YOUR_SERVER_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/your_key
```

### 2. Update Configuration Variables

Check and modify these files if needed:
- Email addresses in backup scripts and Let's Encrypt config
- PHP version requirements for your app
- Any specific app dependencies

### 3. Run the Setup

```bash
# Run the complete setup
ansible-playbook -i inventory.ini 00_majitask_master.yaml

# Or run individual components
ansible-playbook -i inventory.ini 01_update_ubuntu.yaml
ansible-playbook -i inventory.ini 03_nginx.yaml
ansible-playbook -i inventory.ini 04_letsencrypt.yaml
```

## Playbook Structure

- `00_majitask_master.yaml` - Complete server setup orchestration
- `01_update_ubuntu.yaml` - System updates and security patches
- `03_nginx.yaml` - Nginx web server configuration for majitask.fun
- `04_letsencrypt.yaml` - SSL certificate setup for majitask.fun
- `05_install_postfix.yaml` - Email server for notifications
- `06_firewall_ufw.yaml` - UFW firewall configuration
- `07_users.yaml` - User management and SSH keys
- `08_deploying_backup.yaml` - Automated backup system
- `09_skeleton.yaml` - System structure setup
- `10_security_hardening.yaml` - Security hardening measures

## Post-Setup Steps

### 1. Deploy Your Application

Upload your Majitask application to `/home/apps/majitask` on the server:

```bash
# Example using rsync
rsync -avz --delete ./your-app/ user@YOUR_SERVER_IP:/home/apps/majitask/

# Or using git
ssh user@YOUR_SERVER_IP
cd /home/apps/majitask
git clone https://github.com/yourusername/majitask.git .
```

### 2. Configure DNS

Point your domain `majitask.fun` to your server's public IP address:
- A record: majitask.fun → YOUR_SERVER_IP
- CNAME record (optional): www.majitask.fun → majitask.fun

### 3. Test the Setup

1. Visit https://majitask.fun to verify your app is working
2. Check SSL certificate is properly installed
3. Verify email notifications work
4. Test backup system

## File Structure

```
/home/apps/majitask/          # Your application files
/archive/backup/majitask/     # Automated backups
/etc/nginx/sites-available/   # Nginx configuration
/root/bin/                    # Backup scripts
/var/log/                     # Application logs
```

## Backup System

- **Daily backups** of your application directory
- **7-day retention** policy
- **Email notifications** for backup status
- **Manual backup:** Run `/root/bin/server_backup.sh`

## Security Features

- UFW firewall (ports 22, 80, 443 open)
- SSH hardening
- Fail2ban protection
- Security headers in Nginx
- Let's Encrypt SSL certificates

## Application Process Management

- The MajiTask Node.js backend is managed in production using **PM2** (not systemd).
- To start, stop, or restart the app, use:

```bash
pm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 status
pm2 logs
pm2 restart all
pm2 startup
```

- PM2 ensures the app auto-starts on boot and restarts if it crashes.
- No systemd or systemctl commands are required for the Node.js app.

## Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart service
sudo systemctl restart nginx
```

### Application Issues
```bash
# Check app directory permissions
ls -la /home/apps/majitask/

# Fix permissions if needed
sudo chown -R www-data:www-data /home/apps/majitask/
sudo chmod -R 755 /home/apps/majitask/
```

## Configuration Notes

- **Domain:** majitask.fun (update in all config files if changed)
- **Email:** Update email addresses in backup scripts and Let's Encrypt config
- **PHP:** Configured for PHP 8.1+ (adjust if your app needs different version)
- **Database:** Add database setup if your application requires it

## Support

For issues with the Ansible setup, check:
1. Server connectivity and SSH access
2. Domain DNS configuration
3. Nginx and PHP-FPM service status
4. SSL certificate validity
5. Firewall rules and port accessibility
