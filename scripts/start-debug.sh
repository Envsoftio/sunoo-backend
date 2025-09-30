#!/bin/bash

# Kill any existing process on port 3005
echo "Killing existing process on port 3005..."
lsof -ti:3005 | xargs kill -9 2>/dev/null || echo "No process found on port 3005"

# Wait a moment for the port to be released
sleep 2

# Start the app in debug mode
echo "Starting Sunoo Backend in debug mode..."
echo "Debugger will be available on port 9229"
echo "API will be available on http://localhost:3005"
npm run start:debug
