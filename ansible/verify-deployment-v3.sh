#!/bin/bash

# MajiTask v3.0 Deployment Verification Script

set -e

echo "🚀 Starting MajiTask v3.0 Deployment Verification..."

APP_PATH="/home/apps/majitask"
DOMAIN="majitask.fun"
API_URL="https://$DOMAIN/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

echo -e "\n${YELLOW}1. System Services Check${NC}"

# Check PostgreSQL
sudo systemctl is-active --quiet postgresql
print_status $? "PostgreSQL service is running"

# Check MajiTask service
sudo systemctl is-active --quiet majitask
print_status $? "MajiTask service is running"

# Check Nginx
sudo systemctl is-active --quiet nginx
print_status $? "Nginx service is running"

echo -e "\n${YELLOW}2. Database Connectivity${NC}"

# Check PostgreSQL connection
sudo -u postgres psql -d majitask -c "SELECT 1;" > /dev/null 2>&1
print_status $? "PostgreSQL database 'majitask' is accessible"

# Check database tables
TABLE_COUNT=$(sudo -u postgres psql -d majitask -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
if [ "$TABLE_COUNT" -gt 0 ]; then
    print_status 0 "Database tables exist (count: $TABLE_COUNT)"
else
    print_status 1 "No database tables found"
fi

echo -e "\n${YELLOW}3. Application Health Check${NC}"

# Check if app is listening on port 3001
ss -tuln | grep -q ":3001 "
print_status $? "Application is listening on port 3001"

# Check PM2 status
sudo -u majitask pm2 list | grep -q "majitask-v3"
print_status $? "PM2 process 'majitask-v3' is running"

echo -e "\n${YELLOW}4. API Endpoints Check${NC}"

# Check health endpoint (if accessible)
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    print_status 0 "Health endpoint responds"
else
    print_status 1 "Health endpoint not accessible (may be expected if SSL not configured)"
fi

# Check if localhost health works
if curl -s -f "http://localhost:3001/api/health" > /dev/null 2>&1; then
    print_status 0 "Local health endpoint responds"
else
    print_status 1 "Local health endpoint not responding"
fi

echo -e "\n${YELLOW}5. File System Check${NC}"

# Check required directories
for dir in "logs" "uploads" "database" "scripts"; do
    if [ -d "$APP_PATH/$dir" ]; then
        print_status 0 "Directory '$dir' exists"
    else
        print_status 1 "Directory '$dir' missing"
    fi
done

# Check critical files
for file in ".env" "package.json" "server/index.js" "database/schema.sql"; do
    if [ -f "$APP_PATH/$file" ]; then
        print_status 0 "File '$file' exists"
    else
        print_status 1 "File '$file' missing"
    fi
done

echo -e "\n${YELLOW}6. Permissions Check${NC}"

# Check ownership
if [ "$(stat -c %U "$APP_PATH")" = "majitask" ]; then
    print_status 0 "App directory ownership is correct"
else
    print_status 1 "App directory ownership is incorrect"
fi

echo -e "\n${YELLOW}7. Security Check${NC}"

# Check .env file permissions
if [ "$(stat -c %a "$APP_PATH/.env")" = "600" ]; then
    print_status 0 ".env file has secure permissions (600)"
else
    print_status 1 ".env file permissions are not secure"
fi

echo -e "\n${YELLOW}8. Log Check${NC}"

# Check if logs are being generated
if [ -f "$APP_PATH/logs/combined.log" ] && [ -s "$APP_PATH/logs/combined.log" ]; then
    print_status 0 "Application logs are being generated"
else
    print_status 1 "No application logs found or empty"
fi

echo -e "\n${YELLOW}9. Environment Variables Check${NC}"

# Check if .env has required variables
REQUIRED_VARS=("DB_HOST" "DB_NAME" "JWT_SECRET" "SMTP_HOST")
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" "$APP_PATH/.env"; then
        print_status 0 "Environment variable '$var' is set"
    else
        print_status 1 "Environment variable '$var' is missing"
    fi
done

echo -e "\n${GREEN}=== Deployment Verification Summary ===${NC}"

# Quick status overview
echo -e "\n${YELLOW}Services Status:${NC}"
echo "PostgreSQL: $(systemctl is-active postgresql)"
echo "MajiTask: $(systemctl is-active majitask)"
echo "Nginx: $(systemctl is-active nginx)"

echo -e "\n${YELLOW}Process Status:${NC}"
sudo -u majitask pm2 list --no-color 2>/dev/null || echo "PM2 not accessible"

echo -e "\n${YELLOW}Recent Logs (last 10 lines):${NC}"
if [ -f "$APP_PATH/logs/combined.log" ]; then
    tail -n 10 "$APP_PATH/logs/combined.log"
else
    echo "No application logs found"
fi

echo -e "\n${YELLOW}System Logs (last 5 lines):${NC}"
journalctl -u majitask --no-pager -n 5

echo -e "\n${GREEN}Verification completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Configure DNS to point to this server"
echo "2. Test SSL certificate generation"
echo "3. Access application at https://$DOMAIN"
echo "4. Login with admin credentials from .env file"
echo "5. Create test users and tasks"

echo -e "\n${YELLOW}Useful commands:${NC}"
echo "- Check logs: journalctl -u majitask -f"
echo "- PM2 status: sudo -u majitask pm2 list"
echo "- Restart app: sudo systemctl restart majitask"
echo "- Database access: sudo -u postgres psql majitask"
