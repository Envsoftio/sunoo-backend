#!/bin/bash

# Reset GitHub Actions runners for vishnu user
# This script will completely remove old runners and set up new ones with vishnu user

set -e

echo "🔄 Resetting GitHub Actions Runners for Vishnu User..."

# Stop and disable existing services
echo "🛑 Stopping existing runner services..."
sudo systemctl stop github-runner-prod 2>/dev/null || true
sudo systemctl stop github-runner-staging 2>/dev/null || true
sudo systemctl disable github-runner-prod 2>/dev/null || true
sudo systemctl disable github-runner-staging 2>/dev/null || true

# Remove old runner directories
echo "🗑️  Removing old runner directories..."
sudo rm -rf /opt/actions-runner-prod
sudo rm -rf /opt/actions-runner-staging

# Create new runner directories
echo "📁 Creating new runner directories..."
sudo mkdir -p /opt/actions-runner-prod
sudo mkdir -p /opt/actions-runner-staging
sudo chown -R vishnu:vishnu /opt/actions-runner*

# Download fresh runners
echo "📥 Downloading fresh GitHub Actions runners..."
cd /opt/actions-runner-prod
sudo -u vishnu wget https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
sudo -u vishnu tar xzf actions-runner-linux-x64-2.328.0.tar.gz
sudo -u vishnu rm actions-runner-linux-x64-2.328.0.tar.gz

cd /opt/actions-runner-staging
sudo -u vishnu wget https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
sudo -u vishnu tar xzf actions-runner-linux-x64-2.328.0.tar.gz
sudo -u vishnu rm actions-runner-linux-x64-2.328.0.tar.gz

# Create new service files
echo "⚙️ Creating new service files..."

# Production runner service
sudo tee /etc/systemd/system/github-runner-prod.service > /dev/null << EOF
[Unit]
Description=GitHub Actions Runner - Production
After=network.target

[Service]
Type=simple
User=vishnu
WorkingDirectory=/opt/actions-runner-prod
ExecStart=/opt/actions-runner-prod/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Staging runner service
sudo tee /etc/systemd/system/github-runner-staging.service > /dev/null << EOF
[Unit]
Description=GitHub Actions Runner - Staging
After=network.target

[Service]
Type=simple
User=vishnu
WorkingDirectory=/opt/actions-runner-staging
ExecStart=/opt/actions-runner-staging/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Get registration token
echo "🔑 Getting registration token..."
echo "You need to get the registration token from your GitHub repository:"
echo "1. Go to Settings > Actions > Runners"
echo "2. Click 'New self-hosted runner'"
echo "3. Select 'Linux' and 'x64'"
echo "4. Copy the registration token"
echo ""
echo "Note: You can use the SAME token for both runners!"
echo ""

read -p "Enter the registration token: " REGISTRATION_TOKEN

if [ -z "$REGISTRATION_TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Configure production runner
echo "🔧 Configuring production runner..."
cd /opt/actions-runner-prod
sudo -u vishnu ./config.sh --url https://github.com/Envsoftio/sunoo-backend --token $REGISTRATION_TOKEN --name "production-runner" --labels "self-hosted,production" --work _work

# Configure staging runner
echo "🔧 Configuring staging runner..."
cd /opt/actions-runner-staging
sudo -u vishnu ./config.sh --url https://github.com/Envsoftio/sunoo-backend --token $REGISTRATION_TOKEN --name "staging-runner" --labels "self-hosted,staging" --work _work

# Reload systemd and start services
echo "🚀 Starting runner services..."
sudo systemctl daemon-reload
sudo systemctl enable github-runner-prod
sudo systemctl enable github-runner-staging
sudo systemctl start github-runner-prod
sudo systemctl start github-runner-staging

# Check status
echo "📊 Checking runner status..."
sudo systemctl status github-runner-prod --no-pager -l
echo ""
sudo systemctl status github-runner-staging --no-pager -l

echo ""
echo "✅ GitHub Actions runners reset successfully!"
echo "👤 Both runners are now running as 'vishnu' user"
echo "🔗 Repository: https://github.com/Envsoftio/sunoo-backend"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status github-runner-prod"
echo "  sudo systemctl status github-runner-staging"
echo "  sudo journalctl -u github-runner-prod -f"
echo "  sudo journalctl -u github-runner-staging -f"
