#!/bin/bash

# Log rotation script for Sunoo Backend
# This script should be run via cron job to manage log files

LOG_DIR="/Users/vishnusharma/Server/sunoo-backend/logs"
SUBSCRIPTION_LOG_DIR="$LOG_DIR/subscription"

# Create directories if they don't exist
mkdir -p "$LOG_DIR"
mkdir -p "$SUBSCRIPTION_LOG_DIR"

# Function to rotate log files
rotate_logs() {
    local log_file="$1"
    local max_files="$2"

    if [ -f "$log_file" ]; then
        # Create rotated files with timestamp
        for i in $(seq $((max_files-1)) -1 1); do
            if [ -f "${log_file}.${i}" ]; then
                mv "${log_file}.${i}" "${log_file}.$((i+1))"
            fi
        done

        # Move current log to .1
        mv "$log_file" "${log_file}.1"

        # Create new empty log file
        touch "$log_file"

        echo "Rotated log file: $log_file"
    fi
}

# Rotate main application logs
rotate_logs "$LOG_DIR/application.log" 5
rotate_logs "$LOG_DIR/error.log" 5

# Rotate subscription logs
rotate_logs "$SUBSCRIPTION_LOG_DIR/subscription.log" 10
rotate_logs "$SUBSCRIPTION_LOG_DIR/subscription-error.log" 10
rotate_logs "$SUBSCRIPTION_LOG_DIR/webhooks.log" 15
rotate_logs "$SUBSCRIPTION_LOG_DIR/webhook-errors.log" 10

# Clean up old rotated files (keep only the specified number)
find "$LOG_DIR" -name "*.log.*" -type f | while read file; do
    file_num=$(echo "$file" | grep -o '[0-9]\+$')
    if [ "$file_num" -gt 20 ]; then
        rm "$file"
        echo "Removed old log file: $file"
    fi
done

echo "Log rotation completed at $(date)"
