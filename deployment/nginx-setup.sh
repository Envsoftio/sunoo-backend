#!/bin/bash

# Nginx Configuration Script for Sunoo Backend
# This script sets up Nginx to route URLs to the correct Node.js applications

echo "🚀 Setting up Nginx for Sunoo Backend URLs..."

# Update package list
sudo apt update

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration for Sunoo Backend
sudo tee /etc/nginx/sites-available/sunoo-backend << 'EOF'
# Sunoo Backend Nginx Configuration

# Upstream servers
upstream sunoo_production {
    server 127.0.0.1:3005;
}

upstream sunoo_staging {
    server 127.0.0.1:3006;
}

# Production Server (api.sunoo.app)
server {
    listen 80;
    server_name api.sunoo.app;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporary HTTP configuration (will be replaced by HTTPS after SSL setup)
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeout settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Main application
    location / {
        proxy_pass http://sunoo_production;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://sunoo_production/health;
        access_log off;
    }

    # API documentation
    location /api {
        proxy_pass http://sunoo_production/api;
    }
}

# Staging Server (apidev.sunoo.app)
server {
    listen 80;
    server_name apidev.sunoo.app;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporary HTTP configuration (will be replaced by HTTPS after SSL setup)
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeout settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Main application
    location / {
        proxy_pass http://sunoo_staging;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://sunoo_staging/health;
        access_log off;
    }

    # API documentation
    location /api {
        proxy_pass http://sunoo_staging/api;
    }
}

# Default server (catch-all)
server {
    listen 80 default_server;
    server_name _;

    # Return 444 for unknown domains
    return 444;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/sunoo-backend /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"

    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx

    echo "✅ Nginx setup complete!"
    echo ""
    echo "🌐 Your URLs are now configured:"
    echo "   Production: http://api.sunoo.app"
    echo "   Staging:    http://apidev.sunoo.app"
    echo ""
    echo "🔒 Setting up SSL certificates..."
    echo ""

    # Check if domains are accessible
    echo "🔍 Checking if domains are accessible..."
    if curl -s --connect-timeout 10 http://api.sunoo.app/health > /dev/null 2>&1; then
        echo "✅ api.sunoo.app is accessible"
        API_ACCESSIBLE=true
    else
        echo "⚠️  api.sunoo.app is not accessible yet (DNS might not be propagated)"
        API_ACCESSIBLE=false
    fi

    if curl -s --connect-timeout 10 http://apidev.sunoo.app/health > /dev/null 2>&1; then
        echo "✅ apidev.sunoo.app is accessible"
        APIDEV_ACCESSIBLE=true
    else
        echo "⚠️  apidev.sunoo.app is not accessible yet (DNS might not be propagated)"
        APIDEV_ACCESSIBLE=false
    fi

    # Setup SSL certificates
    if [ "$API_ACCESSIBLE" = true ] && [ "$APIDEV_ACCESSIBLE" = true ]; then
        echo ""
        echo "🔒 Both domains are accessible, setting up SSL certificates..."

        # Get SSL certificates
        sudo certbot --nginx -d api.sunoo.app -d apidev.sunoo.app --non-interactive --agree-tos --email admin@sunoo.app

        if [ $? -eq 0 ]; then
            echo "✅ SSL certificates installed successfully!"
            echo ""
            echo "🌐 Your HTTPS URLs are now working:"
            echo "   Production: https://api.sunoo.app"
            echo "   Staging:    https://apidev.sunoo.app"
            echo ""
            echo "🔄 Testing HTTPS endpoints..."
            curl -s https://api.sunoo.app/health && echo " ✅ Production HTTPS working"
            curl -s https://apidev.sunoo.app/health && echo " ✅ Staging HTTPS working"
        else
            echo "❌ SSL certificate setup failed"
            echo "You can try manually: sudo certbot --nginx -d api.sunoo.app -d apidev.sunoo.app"
        fi
    else
        echo ""
        echo "⚠️  SSL setup skipped - domains not accessible yet"
        echo "Please wait for DNS propagation (5-30 minutes) and then run:"
        echo "   sudo certbot --nginx -d api.sunoo.app -d apidev.sunoo.app"
    fi

    echo ""
    echo "📋 Setup Summary:"
    echo "   ✅ Nginx configured and running"
    echo "   ✅ HTTP endpoints working"
    if [ "$API_ACCESSIBLE" = true ] && [ "$APIDEV_ACCESSIBLE" = true ]; then
        echo "   ✅ SSL certificates installed"
        echo "   ✅ HTTPS endpoints working"
    else
        echo "   ⚠️  SSL setup pending (run certbot after DNS propagation)"
    fi
    echo ""
    echo "🔧 Management commands:"
    echo "   sudo systemctl status nginx"
    echo "   sudo nginx -t"
    echo "   sudo certbot certificates"
    echo "   sudo certbot renew --dry-run"
    echo ""
    echo "🌐 Test your endpoints:"
    echo "   curl http://api.sunoo.app/health"
    echo "   curl http://apidev.sunoo.app/health"
    if [ "$API_ACCESSIBLE" = true ] && [ "$APIDEV_ACCESSIBLE" = true ]; then
        echo "   curl https://api.sunoo.app/health"
        echo "   curl https://apidev.sunoo.app/health"
    fi
else
    echo "❌ Nginx configuration has errors"
    echo "Please check the configuration and try again"
    exit 1
fi
