#!/bin/bash

# VPS Setup Script for Sunoo Backend
# This script prepares the VPS for GitHub Actions self-hosted runners

set -e

echo "🚀 Setting up VPS for Sunoo Backend deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y


# # Install PostgreSQL client (if needed for migrations)
# echo "📦 Installing PostgreSQL client..."
# sudo apt-get install -y postgresql-client

# Install curl and other utilities
echo "📦 Installing utilities..."
sudo apt-get install -y curl wget git unzip

# Create deployment directories
echo "📁 Creating deployment directories..."
sudo mkdir -p /opt/sunoo-backend
sudo mkdir -p /opt/sunoo-backend-staging
sudo mkdir -p /opt/sunoo-backend/logs
sudo mkdir -p /opt/sunoo-backend-staging/logs

# Note: Using vishnu user for deployment (already exists with sudo access)
echo "👤 Using vishnu user for deployment..."
echo "✅ Vishnu user already exists with sudo access"

# Set permissions for vishnu user
echo "🔐 Setting permissions..."
sudo chown -R vishnu:vishnu /opt/sunoo-backend*
sudo chmod -R 755 /opt/sunoo-backend*

# Create systemd service directories
echo "⚙️ Setting up systemd services..."
sudo mkdir -p /etc/systemd/system

# Install GitHub Actions runner dependencies
echo "🤖 Installing GitHub Actions runner dependencies..."
sudo apt-get install -y libc6 libgcc1 libgssapi-krb5-2 libssl3 libstdc++6 zlib1g

# Create runner directories
echo "📁 Creating runner directories..."
sudo mkdir -p /opt/actions-runner-prod
sudo mkdir -p /opt/actions-runner-staging
sudo chown -R deploy:deploy /opt/actions-runner*

# Download GitHub Actions runner
echo "📥 Downloading GitHub Actions runner..."
cd /opt/actions-runner-prod
sudo -u deploy wget  https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
sudo -u deploy tar xzf actions-runner-linux-x64-2.311.0.tar.gz

cd /opt/actions-runner-staging
sudo -u deploy wget https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
sudo -u deploy tar xzf actions-runner-linux-x64-2.328.0.tar.gz

# Create runner service files
echo "⚙️ Creating runner service files..."

# Production runner service
sudo tee /etc/systemd/system/github-runner-prod.service > /dev/null << EOF
[Unit]
Description=GitHub Actions Runner - Production
After=network.target

[Service]
Type=simple
User=deploy
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
User=deploy
WorkingDirectory=/opt/actions-runner-staging
ExecStart=/opt/actions-runner-staging/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create setup script for runners
echo "📝 Creating runner setup script..."
sudo tee /opt/setup-runners.sh > /dev/null << 'EOF'
#!/bin/bash

echo "🤖 Setting up GitHub Actions runners..."
echo "You need to get the registration token from your GitHub repository:"
echo "1. Go to Settings > Actions > Runners"
echo "2. Click 'New self-hosted runner'"
echo "3. Select 'Linux' and 'x64'"
echo "4. Copy the registration token"
echo ""
echo "Note: You can use the SAME token for both runners!"

read -p "Enter the registration token (same for both runners): " REGISTRATION_TOKEN./config.sh --url https://github.com/Envsoftio/SunooApp --token A3CAO23IFNPDXUYDZLQD6JLI4DHDG

# Configure production runner
cd /opt/actions-runner-prod
sudo -u deploy ./config.sh --url https://github.com/Envsoftio/SunooApp --token $REGISTRATION_TOKEN --name "production-runner" --labels "self-hosted,production" --work _work

# Configure staging runner
cd /opt/actions-runner-staging
sudo -u deploy ./config.sh --url https://github.com/Envsoftio/SunooApp --token $REGISTRATION_TOKEN --name "staging-runner" --labels "self-hosted,staging" --work _work

echo "✅ Runners configured successfully!"
echo "🚀 Starting runner services..."

sudo systemctl daemon-reload
sudo systemctl enable github-runner-prod
sudo systemctl enable github-runner-staging
sudo systemctl start github-runner-prod
sudo systemctl start github-runner-staging

echo "✅ Setup complete!"
echo "Check runner status with:"
echo "  sudo systemctl status github-runner-prod"
echo "  sudo systemctl status github-runner-staging"
EOF

sudo chmod +x /opt/setup-runners.sh

# Create firewall rules (if ufw is installed)
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3005/tcp  # Production port
    sudo ufw allow 3006/tcp  # Staging port
    sudo ufw allow 22/tcp    # SSH
    echo "✅ Firewall rules added"
else
    echo "⚠️ UFW not found, please configure firewall manually"
fi

# Create log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/sunoo-backend > /dev/null << EOF
/opt/sunoo-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        systemctl reload sunoo-backend-prod || true
    endscript
}

/opt/sunoo-backend-staging/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        systemctl reload sunoo-backend-staging || true
    endscript
}
EOF

echo "✅ VPS setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update the repository URL in /opt/setup-runners.sh"
echo "2. Run: sudo /opt/setup-runners.sh"
echo "3. Configure your GitHub repository secrets"
echo "4. Push to main/develop branches to trigger deployments"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status github-runner-prod"
echo "  sudo systemctl status github-runner-staging"
echo "  sudo systemctl status sunoo-backend-prod"
echo "  sudo systemctl status sunoo-backend-staging"
echo "  pm2 status"
echo "  pm2 logs"
