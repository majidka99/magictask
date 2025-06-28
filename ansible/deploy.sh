#!/bin/bash

# Majitask Server Deployment Script
# Run this script to set up your Majitask server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Majitask Server Setup ===${NC}"

# Check if inventory is configured
if grep -q "YOUR_SERVER_IP" inventory.ini; then
    echo -e "${RED}Error: Please update inventory.ini with your server IP address${NC}"
    echo "Edit inventory.ini and replace YOUR_SERVER_IP with your actual server IP"
    exit 1
fi

# Check if we can connect to the server
echo -e "${YELLOW}Testing server connectivity...${NC}"
if ansible all -i inventory.ini -m ping; then
    echo -e "${GREEN}✓ Server connectivity OK${NC}"
else
    echo -e "${RED}✗ Cannot connect to server. Check your inventory.ini and SSH configuration${NC}"
    exit 1
fi

# Run the setup
echo -e "${YELLOW}Starting Majitask server setup...${NC}"
echo "This will:"
echo "- Update the server"
echo "- Install Node.js 20.x"
echo "- Install and configure Nginx for React SPA + Node.js API"
echo "- Set up SSL with Let's Encrypt"
echo "- Configure firewall"
echo "- Set up backup system"
echo "- Apply security hardening"
echo "- Deploy and configure the Majitask application"

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Run the main playbook
ansible-playbook -i inventory.ini 00_majitask_master.yaml

echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo
echo "Next steps:"
echo "1. Deploy your Majitask application to /home/apps/majitask on the server"
echo "2. Ensure DNS for majitask.fun points to your server IP"
echo "3. Test your application at https://majitask.fun"
echo
echo "Useful commands:"
echo "- Check server status: ansible all -i inventory.ini -m ping"
echo "- View Nginx logs: ssh user@server 'sudo tail -f /var/log/nginx/error.log'"
echo "- Test SSL: curl -I https://majitask.fun"
