#!/bin/bash

# Secure Firewall Setup Script for Sunoo Backend
# This script configures UFW firewall with minimal open ports

echo "🔥 Setting up secure firewall for Sunoo Backend..."

# Enable UFW if not already enabled
sudo ufw --force enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh
sudo ufw allow 22

# Allow HTTPS only
sudo ufw allow 443

# Allow your Node.js applications (optional - for direct access)
sudo ufw allow 3005
sudo ufw allow 3006

# Allow Redis (if running on same server)
sudo ufw allow 6379

# Explicitly deny common ports
sudo ufw deny 80
sudo ufw deny 5432
sudo ufw deny 3306
sudo ufw deny 8080

# Show current status
echo "📋 Current firewall status:"
sudo ufw status verbose

echo ""
echo "✅ Secure firewall setup complete!"
echo ""
echo "🌐 Open ports:"
echo "   22   - SSH"
echo "   443  - HTTPS"
echo "   3005 - Production API (optional)"
echo "   3006 - Staging API (optional)"
echo "   6379 - Redis (optional)"
echo ""
echo "🔒 Closed ports:"
echo "   80   - HTTP (not needed - Nginx handles HTTPS only)"
echo "   5432 - PostgreSQL (database not exposed externally)"
echo "   3306 - MySQL (not used)"
echo "   8080 - Alternative HTTP (not used)"
echo ""
echo "🔒 Your VPS is now properly secured!"
echo ""
echo "⚠️  Note: If you need to set up SSL certificates, temporarily allow port 80:"
echo "   sudo ufw allow 80"
echo "   # Run SSL setup"
echo "   sudo ufw deny 80"
