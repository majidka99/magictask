#!/bin/bash

# MajiTask Auto-Start Script
# This script automatically starts the MajiTask application on VM boot

SCRIPT_DIR="/home/majid/majitask"
LOG_FILE="/home/majid/majitask/startup.log"
PID_FILE="/home/majid/majitask/majitask.pid"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check if the app is already running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Process is running
        else
            rm -f "$PID_FILE"  # Remove stale PID file
            return 1  # Process is not running
        fi
    fi
    return 1  # PID file doesn't exist
}

# Function to start the application
start_app() {
    log_message "Starting MajiTask application..."
    
    cd "$SCRIPT_DIR" || {
        log_message "ERROR: Cannot change to directory $SCRIPT_DIR"
        exit 1
    }
    
    # Start the application in background and save PID
    nohup npx vite --host 0.0.0.0 --port 3001 > /home/majid/majitask/app.log 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    log_message "MajiTask started with PID: $pid"
    log_message "Application accessible at:"
    log_message "  - Local: http://localhost:3001/"
    log_message "  - Network: http://$(hostname -I | awk '{print $1}'):3001/"
}

# Function to stop the application
stop_app() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log_message "Stopping MajiTask application (PID: $pid)..."
        kill "$pid"
        rm -f "$PID_FILE"
        log_message "MajiTask stopped"
    else
        log_message "MajiTask is not running"
    fi
}

# Function to restart the application
restart_app() {
    stop_app
    sleep 2
    start_app
}

# Function to show status
status_app() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo "MajiTask is running (PID: $pid)"
        echo "Accessible at:"
        echo "  - Local: http://localhost:3001/"
        echo "  - Network: http://$(hostname -I | awk '{print $1}'):3001/"
        return 0
    else
        echo "MajiTask is not running"
        return 1
    fi
}

# Main script logic
case "$1" in
    start)
        if is_running; then
            echo "MajiTask is already running"
            exit 0
        fi
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    status)
        status_app
        ;;
    *)
        # Default action: start if not running
        if ! is_running; then
            log_message "Auto-starting MajiTask on system boot..."
            start_app
        else
            log_message "MajiTask is already running on system boot"
        fi
        ;;
esac

exit 0
