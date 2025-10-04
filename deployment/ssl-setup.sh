#!/bin/bash

# SSL Setup Script for Sunoo Backend
# This script sets up SSL certificates using Let's Encrypt

echo "🔒 Setting up SSL certificates for Sunoo Backend..."

# Check if domains are accessible
echo "🔍 Checking domain accessibility..."

API_ACCESSIBLE=false
APIDEV_ACCESSIBLE=false

if curl -s --connect-timeout 10 http://api.sunoo.app/health > /dev/null 2>&1; then
    echo "✅ api.sunoo.app is accessible"
    API_ACCESSIBLE=true
else
    echo "❌ api.sunoo.app is not accessible"
    echo "   Please check DNS configuration and try again"
fi

if curl -s --connect-timeout 10 http://apidev.sunoo.app/health > /dev/null 2>&1; then
    echo "✅ apidev.sunoo.app is accessible"
    APIDEV_ACCESSIBLE=true
else
    echo "❌ apidev.sunoo.app is not accessible"
    echo "   Please check DNS configuration and try again"
fi

if [ "$API_ACCESSIBLE" = false ] || [ "$APIDEV_ACCESSIBLE" = false ]; then
    echo ""
    echo "❌ Cannot proceed with SSL setup - domains not accessible"
    echo ""
    echo "📋 Please ensure:"
    echo "   1. DNS records point to this server's IP"
    echo "   2. Nginx is running and configured"
    echo "   3. PM2 applications are running on ports 3005/3006"
    echo ""
    echo "🔧 Check DNS propagation:"
    echo "   nslookup api.sunoo.app"
    echo "   nslookup apidev.sunoo.app"
    echo ""
    echo "🔧 Check services:"
    echo "   sudo systemctl status nginx"
    echo "   pm2 status"
    echo ""
    exit 1
fi

echo ""
echo "🔒 Both domains are accessible, proceeding with SSL setup..."

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Get SSL certificates
echo "🔒 Obtaining SSL certificates from Let's Encrypt..."
sudo certbot --nginx -d api.sunoo.app -d apidev.sunoo.app --non-interactive --agree-tos --email admin@sunoo.app

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificates installed successfully!"
    echo ""
    echo "🌐 Your HTTPS URLs are now working:"
    echo "   Production: https://api.sunoo.app"
    echo "   Staging:    https://apidev.sunoo.app"
    echo ""

    # Test HTTPS endpoints
    echo "🔄 Testing HTTPS endpoints..."
    if curl -s https://api.sunoo.app/health > /dev/null 2>&1; then
        echo "✅ Production HTTPS working: https://api.sunoo.app/health"
    else
        echo "❌ Production HTTPS not working"
    fi

    if curl -s https://apidev.sunoo.app/health > /dev/null 2>&1; then
        echo "✅ Staging HTTPS working: https://apidev.sunoo.app/health"
    else
        echo "❌ Staging HTTPS not working"
    fi

    echo ""
    echo "🔒 SSL Configuration Complete!"
    echo ""
    echo "📋 What was configured:"
    echo "   ✅ SSL certificates from Let's Encrypt"
    echo "   ✅ Automatic HTTP to HTTPS redirect"
    echo "   ✅ Security headers"
    echo "   ✅ Auto-renewal (configured by certbot)"
    echo ""
    echo "🔧 SSL Management Commands:"
    echo "   sudo certbot certificates          # View certificates"
    echo "   sudo certbot renew --dry-run       # Test renewal"
    echo "   sudo certbot renew                 # Renew certificates"
    echo "   sudo certbot delete -d api.sunoo.app  # Delete certificate"
    echo ""
    echo "🔄 Auto-renewal:"
    echo "   Certificates auto-renew every 12 hours"
    echo "   Check renewal: sudo certbot renew --dry-run"
    echo ""
    echo "🌐 Test your secure endpoints:"
    echo "   curl https://api.sunoo.app/health"
    echo "   curl https://apidev.sunoo.app/health"
    echo "   curl https://api.sunoo.app/api"
    echo "   curl https://apidev.sunoo.app/api"

else
    echo ""
    echo "❌ SSL certificate setup failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check if domains are accessible:"
    echo "      curl http://api.sunoo.app/health"
    echo "      curl http://apidev.sunoo.app/health"
    echo ""
    echo "   2. Check Nginx configuration:"
    echo "      sudo nginx -t"
    echo ""
    echo "   3. Check Nginx logs:"
    echo "      sudo tail -f /var/log/nginx/error.log"
    echo ""
    echo "   4. Try manual setup:"
    echo "      sudo certbot --nginx -d api.sunoo.app -d apidev.sunoo.app"
    echo ""
    echo "   5. Check firewall:"
    echo "      sudo ufw status"
    echo ""
    exit 1
fi

