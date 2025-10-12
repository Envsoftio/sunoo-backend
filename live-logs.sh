#!/bin/bash

# =============================================================================
# SUNOO BACKEND - COMPREHENSIVE LIVE LOG MONITOR
# =============================================================================
# A single, powerful script to monitor all application logs in real-time
# with detailed formatting, filtering, and analysis capabilities.
# =============================================================================

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Configuration
LOG_DIR="/home/vishnu/sunoo-backend-staging/logs"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="/tmp/sunoo-logs"
PID_FILE="$TEMP_DIR/live-logs.pid"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Log files - ALL LOGS INCLUDED
declare -A LOG_FILES=(
    ["app"]="$LOG_DIR/application.log"
    ["error"]="$LOG_DIR/error.log"
    ["sub"]="$LOG_DIR/subscription/subscription.log"
    ["sub-error"]="$LOG_DIR/subscription/subscription-error.log"
    ["webhook"]="$LOG_DIR/subscription/webhooks.log"
    ["webhook-error"]="$LOG_DIR/subscription/webhook-errors.log"
    ["all"]="ALL_LOGS"  # Special marker for all logs
)

# Log levels
declare -A LOG_LEVELS=(
    ["ERROR"]="$RED"
    ["WARN"]="$YELLOW"
    ["INFO"]="$GREEN"
    ["DEBUG"]="$CYAN"
    ["TRACE"]="$PURPLE"
)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Check if jq is installed
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ Error: jq is not installed${NC}"
        echo -e "${YELLOW}Install with: sudo apt update && sudo apt install jq${NC}"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping live log monitor...${NC}"
    if [ -f "$PID_FILE" ]; then
        local pids=$(cat "$PID_FILE")
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
            fi
        done
        rm -f "$PID_FILE"
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# =============================================================================
# LOG PARSING AND FORMATTING
# =============================================================================

# Parse and format a single log line
format_log_line() {
    local line="$1"
    local log_type="$2"

    # Try to parse as JSON first
    if echo "$line" | jq . >/dev/null 2>&1; then
        local timestamp=$(echo "$line" | jq -r '.timestamp // .time // "N/A"')
        local level=$(echo "$line" | jq -r '.level // .severity // "INFO"')
        local message=$(echo "$line" | jq -r '.message // .msg // "N/A"')
        local service=$(echo "$line" | jq -r '.service // .component // "N/A"')
        local user_id=$(echo "$line" | jq -r '.userId // .user_id // "N/A"')
        local subscription_id=$(echo "$line" | jq -r '.subscriptionId // .subscription_id // "N/A"')
        local event_type=$(echo "$line" | jq -r '.eventType // .event_type // "N/A"')
        local error_code=$(echo "$line" | jq -r '.errorCode // .code // "N/A"')
        local stack_trace=$(echo "$line" | jq -r '.stack // .stackTrace // "N/A"')

        # Extract additional detailed fields
        local request_id=$(echo "$line" | jq -r '.requestId // .request_id // .reqId // "N/A"')
        local method=$(echo "$line" | jq -r '.method // .httpMethod // "N/A"')
        local url=$(echo "$line" | jq -r '.url // .path // .endpoint // "N/A"')
        local status_code=$(echo "$line" | jq -r '.statusCode // .status // .code // "N/A"')
        local response_time=$(echo "$line" | jq -r '.responseTime // .duration // .time // "N/A"')
        local ip_address=$(echo "$line" | jq -r '.ip // .ipAddress // .clientIp // "N/A"')
        local user_agent=$(echo "$line" | jq -r '.userAgent // .user_agent // "N/A"')
        local session_id=$(echo "$line" | jq -r '.sessionId // .session_id // "N/A"')
        local plan_id=$(echo "$line" | jq -r '.planId // .plan_id // "N/A"')
        local amount=$(echo "$line" | jq -r '.amount // .price // .cost // "N/A"')
        local currency=$(echo "$line" | jq -r '.currency // "N/A"')
        local payment_id=$(echo "$line" | jq -r '.paymentId // .payment_id // "N/A"')
        local order_id=$(echo "$line" | jq -r '.orderId // .order_id // "N/A"')
        local webhook_id=$(echo "$line" | jq -r '.webhookId // .webhook_id // "N/A"')
        local retry_count=$(echo "$line" | jq -r '.retryCount // .retry_count // "N/A"')
        local database_query=$(echo "$line" | jq -r '.query // .sql // .databaseQuery // "N/A"')
        local table_name=$(echo "$line" | jq -r '.table // .tableName // "N/A"')
        local operation=$(echo "$line" | jq -r '.operation // .op // "N/A"')
        local metadata=$(echo "$line" | jq -r '.metadata // .data // .payload // "N/A"')

        # Format timestamp to IST with better handling
        if [ "$timestamp" != "N/A" ]; then
            # Try multiple timestamp formats and convert to IST
            timestamp=$(TZ='Asia/Kolkata' date -d "$timestamp" "+%Y-%m-%d %H:%M:%S IST" 2>/dev/null || \
                       TZ='Asia/Kolkata' date -d "$timestamp" "+%H:%M:%S IST" 2>/dev/null || \
                       TZ='Asia/Kolkata' date -d "$timestamp" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || \
                       echo "$timestamp")
        else
            # Use current IST time if no timestamp
            timestamp=$(TZ='Asia/Kolkata' date "+%Y-%m-%d %H:%M:%S IST")
        fi

        # Get color for log level
        local level_color="${LOG_LEVELS[$level]:-$WHITE}"

        # Format based on log type with comprehensive details
        case "$log_type" in
            "app")
                echo -e "${GRAY}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}${service}${NC}"
                echo -e "${GRAY}├─ ${message}${NC}"

                # Request details
                if [ "$request_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🆔 Request ID: ${request_id}${NC}"
                fi
                if [ "$method" != "N/A" ] && [ "$url" != "N/A" ]; then
                    echo -e "   ${CYAN}🌐 ${method} ${url}${NC}"
                fi
                if [ "$status_code" != "N/A" ]; then
                    echo -e "   ${CYAN}📊 Status: ${status_code}${NC}"
                fi
                if [ "$response_time" != "N/A" ]; then
                    echo -e "   ${CYAN}⏱️  Response Time: ${response_time}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi
                if [ "$session_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}🔑 Session: ${session_id}${NC}"
                fi

                # Subscription details
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi
                if [ "$plan_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}📋 Plan: ${plan_id}${NC}"
                fi

                # Database details
                if [ "$database_query" != "N/A" ]; then
                    echo -e "   ${YELLOW}🗄️  Query: ${database_query}${NC}"
                fi
                if [ "$table_name" != "N/A" ]; then
                    echo -e "   ${YELLOW}📊 Table: ${table_name}${NC}"
                fi
                if [ "$operation" != "N/A" ]; then
                    echo -e "   ${YELLOW}⚙️  Operation: ${operation}${NC}"
                fi

                # Network details
                if [ "$ip_address" != "N/A" ]; then
                    echo -e "   ${BLUE}🌐 IP: ${ip_address}${NC}"
                fi
                if [ "$user_agent" != "N/A" ]; then
                    echo -e "   ${BLUE}🖥️  User Agent: ${user_agent}${NC}"
                fi
                ;;
            "error")
                echo -e "${RED}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}❌ ERROR${NC}"
                echo -e "${RED}├─ ${message}${NC}"

                # Error details
                if [ "$error_code" != "N/A" ]; then
                    echo -e "   ${RED}🔢 Error Code: ${error_code}${NC}"
                fi
                if [ "$stack_trace" != "N/A" ] && [ "$stack_trace" != "null" ]; then
                    echo -e "   ${RED}📚 Stack Trace: ${stack_trace}${NC}"
                fi

                # Request details
                if [ "$request_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🆔 Request ID: ${request_id}${NC}"
                fi
                if [ "$method" != "N/A" ] && [ "$url" != "N/A" ]; then
                    echo -e "   ${CYAN}🌐 ${method} ${url}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi

                # Additional context
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Metadata: ${metadata}${NC}"
                fi
                ;;
            "sub")
                echo -e "${CYAN}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}💳 SUBSCRIPTION${NC}"
                echo -e "${CYAN}├─ ${message}${NC}"

                # Subscription details
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}🆔 Sub ID: ${subscription_id}${NC}"
                fi
                if [ "$plan_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}📋 Plan ID: ${plan_id}${NC}"
                fi
                if [ "$amount" != "N/A" ]; then
                    echo -e "   ${PURPLE}💰 Amount: ${amount}${NC}"
                fi
                if [ "$currency" != "N/A" ]; then
                    echo -e "   ${PURPLE}💱 Currency: ${currency}${NC}"
                fi
                if [ "$event_type" != "N/A" ]; then
                    echo -e "   ${PURPLE}📅 Event: ${event_type}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi

                # Payment details
                if [ "$payment_id" != "N/A" ]; then
                    echo -e "   ${GREEN}💳 Payment ID: ${payment_id}${NC}"
                fi
                if [ "$order_id" != "N/A" ]; then
                    echo -e "   ${GREEN}📦 Order ID: ${order_id}${NC}"
                fi

                # Request details
                if [ "$request_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🆔 Request ID: ${request_id}${NC}"
                fi

                # Additional context
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Metadata: ${metadata}${NC}"
                fi
                ;;
            "webhook")
                echo -e "${CYAN}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}🔗 WEBHOOK${NC}"
                echo -e "${WHITE}├─ ${message}${NC}"

                # Webhook details
                if [ "$webhook_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🔗 Webhook ID: ${webhook_id}${NC}"
                fi
                if [ "$event_type" != "N/A" ]; then
                    echo -e "   ${CYAN}📅 Event: ${event_type}${NC}"
                fi
                if [ "$retry_count" != "N/A" ]; then
                    echo -e "   ${CYAN}🔄 Retry Count: ${retry_count}${NC}"
                fi

                # Request details
                if [ "$request_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🆔 Request ID: ${request_id}${NC}"
                fi
                if [ "$method" != "N/A" ] && [ "$url" != "N/A" ]; then
                    echo -e "   ${CYAN}🌐 ${method} ${url}${NC}"
                fi
                if [ "$status_code" != "N/A" ]; then
                    echo -e "   ${CYAN}📊 Status: ${status_code}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi

                # Network details
                if [ "$ip_address" != "N/A" ]; then
                    echo -e "   ${GREEN}🌐 IP: ${ip_address}${NC}"
                fi

                # Additional context
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Payload: ${metadata}${NC}"
                fi
                ;;
            "sub-error")
                echo -e "${RED}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}❌ SUBSCRIPTION ERROR${NC}"
                echo -e "${RED}├─ ${message}${NC}"

                # Error details
                if [ "$error_code" != "N/A" ]; then
                    echo -e "   ${RED}🔢 Error Code: ${error_code}${NC}"
                fi
                if [ "$stack_trace" != "N/A" ] && [ "$stack_trace" != "null" ]; then
                    echo -e "   ${RED}📚 Stack: ${stack_trace}${NC}"
                fi

                # Subscription details
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi
                if [ "$plan_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}📋 Plan: ${plan_id}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi

                # Additional context
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Context: ${metadata}${NC}"
                fi
                ;;
            "webhook-error")
                echo -e "${RED}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}❌ WEBHOOK ERROR${NC}"
                echo -e "${WHITE}├─ ${message}${NC}"

                # Error details
                if [ "$error_code" != "N/A" ]; then
                    echo -e "   ${RED}🔢 Error Code: ${error_code}${NC}"
                fi
                if [ "$stack_trace" != "N/A" ] && [ "$stack_trace" != "null" ]; then
                    echo -e "   ${RED}📚 Stack: ${stack_trace}${NC}"
                fi

                # Webhook details
                if [ "$webhook_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🔗 Webhook ID: ${webhook_id}${NC}"
                fi
                if [ "$event_type" != "N/A" ]; then
                    echo -e "   ${CYAN}📅 Event: ${event_type}${NC}"
                fi
                if [ "$retry_count" != "N/A" ]; then
                    echo -e "   ${CYAN}🔄 Retry: ${retry_count}${NC}"
                fi

                # User details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi

                # Additional context
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Context: ${metadata}${NC}"
                fi
                ;;
            *)
                echo -e "${GRAY}┌─ [${timestamp}]${NC} ${level_color}[${level}]${NC} ${BOLD}${service}${NC}"
                echo -e "${GRAY}├─ ${message}${NC}"

                # Show all available details
                if [ "$user_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}👤 User: ${user_id}${NC}"
                fi
                if [ "$subscription_id" != "N/A" ]; then
                    echo -e "   ${PURPLE}💳 Sub: ${subscription_id}${NC}"
                fi
                if [ "$request_id" != "N/A" ]; then
                    echo -e "   ${CYAN}🆔 Request: ${request_id}${NC}"
                fi
                if [ "$metadata" != "N/A" ] && [ "$metadata" != "null" ]; then
                    echo -e "   ${DIM}📋 Data: ${metadata}${NC}"
                fi
                ;;
        esac

        # Add separator line for better readability
        echo -e "${DIM}────────────────────────────────────────────────────────${NC}"
    else
        # Fallback for non-JSON logs with better formatting
        local current_time=$(TZ='Asia/Kolkata' date '+%Y-%m-%d %H:%M:%S IST')
        echo -e "${GRAY}┌─ [${current_time}]${NC} ${WHITE}[RAW]${NC} ${BOLD}${log_type^}${NC}"
        echo -e "${GRAY}└─ ${line}${NC}"
        echo -e "${DIM}────────────────────────────────────────────────────────${NC}"
    fi
}

# =============================================================================
# LIVE MONITORING FUNCTIONS
# =============================================================================

# Monitor a specific log file
monitor_log() {
    local log_file="$1"
    local log_type="$2"
    local filter="$3"

    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}⚠️  Log file not found: $log_file${NC}"
        return
    fi

    # Start tailing the log file
    tail -f "$log_file" 2>/dev/null | while read -r line; do
        if [ -n "$filter" ]; then
            if echo "$line" | grep -qi "$filter"; then
                format_log_line "$line" "$log_type"
            fi
        else
            format_log_line "$line" "$log_type"
        fi
    done &

    # Store PID for cleanup
    echo $! >> "$PID_FILE"
}

# Monitor all logs
monitor_all_logs() {
    local filter="$1"

    echo -e "${GREEN}🚀 Starting comprehensive log monitoring (ALL LOGS)...${NC}"
    echo -e "${BLUE}=======================================================${NC}"
    echo ""

    # Clear PID file
    > "$PID_FILE"

    # Monitor each log file (excluding the special "all" marker)
    for log_type in "${!LOG_FILES[@]}"; do
        local log_file="${LOG_FILES[$log_type]}"
        if [ "$log_type" != "all" ] && [ -f "$log_file" ]; then
            echo -e "${GREEN}📊 Monitoring: ${log_type} (${log_file})${NC}"
            monitor_log "$log_file" "$log_type" "$filter"
        elif [ "$log_type" != "all" ]; then
            echo -e "${YELLOW}⚠️  Skipping: ${log_type} (file not found)${NC}"
        fi
    done

    echo -e "${GREEN}✅ All log monitors started${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
    echo ""

    # Wait for user interrupt
    wait
}

# =============================================================================
# ANALYSIS FUNCTIONS
# =============================================================================

# Show log statistics
show_stats() {
    echo -e "${GREEN}📊 LOG STATISTICS${NC}"
    echo -e "${BLUE}=================${NC}"
    echo ""

    for log_type in "${!LOG_FILES[@]}"; do
        local log_file="${LOG_FILES[$log_type]}"
        if [ -f "$log_file" ]; then
            local size=$(du -h "$log_file" | cut -f1)
            local lines=$(wc -l < "$log_file")
            local modified=$(stat -c %y "$log_file" 2>/dev/null || stat -f %Sm "$log_file" 2>/dev/null)

            echo -e "${CYAN}${log_type^}:${NC}"
            echo -e "  📁 File: $log_file"
            echo -e "  📏 Size: $size"
            echo -e "  📝 Lines: $lines"
            echo -e "  🕒 Modified: $modified"
            echo ""
        fi
    done
}

# Show recent errors
show_recent_errors() {
    echo -e "${RED}❌ RECENT ERRORS (Last 100)${NC}"
    echo -e "${BLUE}============================${NC}"
    echo ""

    # Check all error logs
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ] && [ "$log_file" != "ALL_LOGS" ]; then
            local filename=$(basename "$log_file")
            echo -e "${YELLOW}📁 $filename:${NC}"

            # Look for ERROR level logs
            grep -i "error\|exception\|failed\|fatal" "$log_file" | tail -20 | while read -r line; do
                format_log_line "$line" "error"
            done
            echo ""
        fi
    done
}

# Show subscription activity
show_subscription_activity() {
    echo -e "${GREEN}💳 SUBSCRIPTION ACTIVITY (Last 100)${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""

    local sub_log="${LOG_FILES[sub]}"
    if [ -f "$sub_log" ]; then
        tail -100 "$sub_log" | while read -r line; do
            format_log_line "$line" "sub"
        done
    else
        echo -e "${YELLOW}⚠️  Subscription log not found${NC}"
    fi
}

# Show webhook activity
show_webhook_activity() {
    echo -e "${BLUE}🔗 WEBHOOK ACTIVITY (Last 100)${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""

    local webhook_log="${LOG_FILES[webhook]}"
    if [ -f "$webhook_log" ]; then
        tail -100 "$webhook_log" | while read -r line; do
            format_log_line "$line" "webhook"
        done
    else
        echo -e "${YELLOW}⚠️  Webhook log not found${NC}"
    fi
}

# Show ALL logs comprehensive view
show_all_logs_comprehensive() {
    echo -e "${GREEN}🔍 ALL LOGS COMPREHENSIVE VIEW (Last 100 lines each)${NC}"
    echo -e "${BLUE}====================================================${NC}"
    echo ""

    # Show all log files with their recent activity
    for log_type in "${!LOG_FILES[@]}"; do
        local log_file="${LOG_FILES[$log_type]}"
        if [ "$log_type" != "all" ] && [ -f "$log_file" ]; then
            local filename=$(basename "$log_file")
            local size=$(du -h "$log_file" | cut -f1)
            local lines=$(wc -l < "$log_file")

            echo -e "${YELLOW}📁 ${log_type^} Log: ${filename} (${size}, ${lines} lines)${NC}"
            echo -e "${BLUE}----------------------------------------${NC}"

            tail -100 "$log_file" | while read -r line; do
                format_log_line "$line" "$log_type"
            done
            echo ""
        fi
    done

    echo -e "${GREEN}✅ All logs comprehensive view complete${NC}"
}

# =============================================================================
# MAIN MENU
# =============================================================================

show_menu() {
    clear
    echo -e "${GREEN}${BOLD}🚀 SUNOO BACKEND - LIVE LOG MONITOR${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    echo -e "${CYAN}1.${NC} Monitor All Logs (Live)"
    echo -e "${CYAN}2.${NC} Monitor Application Logs Only"
    echo -e "${CYAN}3.${NC} Monitor Subscription Logs Only"
    echo -e "${CYAN}4.${NC} Monitor Webhook Logs Only"
    echo -e "${CYAN}5.${NC} Monitor Error Logs Only"
    echo -e "${CYAN}6.${NC} Filter Logs (Search)"
    echo -e "${CYAN}7.${NC} Show Recent Errors (100 lines)"
    echo -e "${CYAN}8.${NC} Show Subscription Activity (100 lines)"
    echo -e "${CYAN}9.${NC} Show Webhook Activity (100 lines)"
    echo -e "${CYAN}10.${NC} Show Log Statistics"
    echo -e "${CYAN}11.${NC} Show All Logs (Comprehensive View - 100 lines each)"
    echo -e "${CYAN}0.${NC} Exit"
    echo ""
    echo -n -e "${YELLOW}Choose an option: ${NC}"
}

# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

# Handle command line arguments
handle_cli() {
    case "$1" in
        "all"|"live")
            monitor_all_logs "$2"
            ;;
        "app"|"application")
            monitor_log "${LOG_FILES[app]}" "app" "$2"
            wait
            ;;
        "sub"|"subscription")
            monitor_log "${LOG_FILES[sub]}" "sub" "$2"
            wait
            ;;
        "webhook"|"webhooks")
            monitor_log "${LOG_FILES[webhook]}" "webhook" "$2"
            wait
            ;;
        "error"|"errors")
            monitor_log "${LOG_FILES[error]}" "error" "$2"
            wait
            ;;
        "stats"|"statistics")
            show_stats
            ;;
        "errors"|"recent-errors")
            show_recent_errors
            ;;
        "subscription-activity")
            show_subscription_activity
            ;;
        "webhook-activity")
            show_webhook_activity
            ;;
        "comprehensive"|"all-logs")
            show_all_logs_comprehensive
            ;;
        *)
            echo -e "${RED}❌ Invalid command${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC}"
            echo "  $0 [command] [filter]"
            echo ""
            echo -e "${YELLOW}Commands:${NC}"
            echo "  all, live              - Monitor all logs live"
            echo "  app, application       - Monitor application logs"
            echo "  sub, subscription      - Monitor subscription logs"
            echo "  webhook, webhooks      - Monitor webhook logs"
            echo "  error, errors          - Monitor error logs"
            echo "  stats, statistics      - Show log statistics"
            echo "  errors, recent-errors  - Show recent errors (100 lines)"
            echo "  subscription-activity  - Show subscription activity (100 lines)"
            echo "  webhook-activity       - Show webhook activity (100 lines)"
            echo "  comprehensive          - Show ALL logs comprehensive view (100 lines each)"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0 live                    # Monitor all logs"
            echo "  $0 app 'error'             # Monitor app logs with error filter"
            echo "  $0 sub 'subscription'      # Monitor subscription logs"
            echo "  $0 comprehensive           # Show all logs at once"
            exit 1
            ;;
    esac
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    check_dependencies

    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -r choice

            case $choice in
                1)
                    monitor_all_logs
                    ;;
                2)
                    monitor_log "${LOG_FILES[app]}" "app"
                    wait
                    ;;
                3)
                    monitor_log "${LOG_FILES[sub]}" "sub"
                    wait
                    ;;
                4)
                    monitor_log "${LOG_FILES[webhook]}" "webhook"
                    wait
                    ;;
                5)
                    monitor_log "${LOG_FILES[error]}" "error"
                    wait
                    ;;
                6)
                    echo -n "Enter filter term: "
                    read -r filter
                    monitor_all_logs "$filter"
                    ;;
                7)
                    show_recent_errors
                    read -p "Press Enter to continue..."
                    ;;
                8)
                    show_subscription_activity
                    read -p "Press Enter to continue..."
                    ;;
                9)
                    show_webhook_activity
                    read -p "Press Enter to continue..."
                    ;;
                10)
                    show_stats
                    read -p "Press Enter to continue..."
                    ;;
                11)
                    show_all_logs_comprehensive
                    read -p "Press Enter to continue..."
                    ;;
                0)
                    echo -e "${GREEN}👋 Goodbye!${NC}"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ Invalid option${NC}"
                    read -p "Press Enter to continue..."
                    ;;
            esac
        done
    else
        # Command line mode
        handle_cli "$@"
    fi
}

# Run main function
main "$@"
