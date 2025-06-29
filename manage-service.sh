#!/bin/bash

# MajiTask Service Management Script
# Simple interface to manage the MajiTask systemd service

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="majitask_v1.service"

print_status() {
    echo -e "${BLUE}=== MajiTask_v1 Service Status ===${NC}"
    systemctl status $SERVICE_NAME --no-pager -l
    echo
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}✅ Service is running${NC}"
        echo -e "${GREEN}🌐 Access URLs:${NC}"
        echo -e "   Local:  http://localhost:3863/"
        echo -e "   Network: http://$(hostname -I | awk '{print $1}'):3863/"
    else
        echo -e "${RED}❌ Service is not running${NC}"
    fi
    
    if systemctl is-enabled --quiet $SERVICE_NAME; then
        echo -e "${GREEN}✅ Auto-start enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Auto-start disabled${NC}"
    fi
}

show_logs() {
    echo -e "${BLUE}=== Recent MajiTask Logs ===${NC}"
    journalctl -u $SERVICE_NAME --since "10 minutes ago" --no-pager
}

test_connection() {
    echo -e "${BLUE}=== Testing Connection ===${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3863/ | grep -q "200"; then
        echo -e "${GREEN}✅ Application is responding (HTTP 200)${NC}"
    else
        echo -e "${RED}❌ Application is not responding${NC}"
    fi
}

show_help() {
    echo -e "${BLUE}MajiTask Service Manager${NC}"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start     Start the MajiTask service"
    echo "  stop      Stop the MajiTask service"
    echo "  restart   Restart the MajiTask service"
    echo "  status    Show service status and connection info"
    echo "  logs      Show recent service logs"
    echo "  test      Test if application is responding"
    echo "  enable    Enable auto-start on boot"
    echo "  disable   Disable auto-start on boot"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0 status    # Check if service is running"
    echo "  $0 restart  # Restart the service"
    echo "  $0 logs     # View recent logs"
}

case "$1" in
    start)
        echo -e "${YELLOW}Starting MajiTask service...${NC}"
        sudo systemctl start $SERVICE_NAME
        sleep 2
        print_status
        ;;
    stop)
        echo -e "${YELLOW}Stopping MajiTask service...${NC}"
        sudo systemctl stop $SERVICE_NAME
        sleep 1
        print_status
        ;;
    restart)
        echo -e "${YELLOW}Restarting MajiTask service...${NC}"
        sudo systemctl restart $SERVICE_NAME
        sleep 3
        print_status
        ;;
    status)
        print_status
        echo
        test_connection
        ;;
    logs)
        show_logs
        ;;
    test)
        test_connection
        ;;
    enable)
        echo -e "${YELLOW}Enabling auto-start on boot...${NC}"
        sudo systemctl enable $SERVICE_NAME
        print_status
        ;;
    disable)
        echo -e "${YELLOW}Disabling auto-start on boot...${NC}"
        sudo systemctl disable $SERVICE_NAME
        print_status
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        print_status
        echo
        test_connection
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo
        show_help
        exit 1
        ;;
esac
