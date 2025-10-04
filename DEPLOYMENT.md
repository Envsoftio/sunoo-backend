# Sunoo Backend Deployment Guide

This guide covers deploying the Sunoo Backend to a VPS using GitHub Actions with self-hosted runners.

## Architecture Overview

- **Production**: Runs on port 3005, triggered by pushes to `main` branch
- **Staging**: Runs on port 3006, triggered by pushes to `develop` or `staging` branches
- **Process Management**: PM2 with cluster mode for production
- **Service Management**: Systemd services for automatic startup
- **Security**: No source code or environment files remain on server after deployment

## Prerequisites

1. Ubuntu 20.04+ VPS
2. GitHub repository with Actions enabled
3. Database (PostgreSQL) accessible from VPS
4. Domain name (optional, for production)

## VPS Setup

### 1. Initial Server Setup

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Run the setup script
wget https://raw.githubusercontent.com/your-username/sunoo-backend/main/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2. Configure GitHub Runners

```bash
# Edit the setup script with your repository details
sudo nano /opt/setup-runners.sh

# Update the repository URL
# Change: https://github.com/YOUR_USERNAME/YOUR_REPO
# To: https://github.com/your-actual-username/sunoo-backend

# Run the runner setup
sudo /opt/setup-runners.sh
```

### 3. GitHub Repository Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

#### Production Secrets (PROD\_\*)

**Database Configuration**

- `PROD_DB_HOST`
- `PROD_DB_PORT`
- `PROD_DB_USERNAME`
- `PROD_DB_PASSWORD`
- `PROD_DB_NAME`

**Redis Configuration**

- `PROD_REDIS_HOST`
- `PROD_REDIS_PORT`
- `PROD_REDIS_PASSWORD`

**JWT Configuration**

- `PROD_JWT_SECRET`
- `PROD_JWT_EXPIRES_IN`
- `PROD_JWT_ACCESS_EXPIRES_IN`
- `PROD_JWT_REFRESH_EXPIRES_IN`
- `PROD_JWT_ISSUER`
- `PROD_JWT_AUDIENCE`
- `PROD_JWT_ALGORITHM`

**Email Configuration**

- `PROD_SMTP_HOST`
- `PROD_SMTP_PORT`
- `PROD_SMTP_SECURE`
- `PROD_SMTP_USER`
- `PROD_SMTP_PASS`
- `PROD_EMAIL_FROM_NAME`
- `PROD_EMAIL_FROM_EMAIL`
- `PROD_EMAIL_BASE_URL`
- `PROD_EMAIL_APP_NAME`
- `PROD_EMAIL_APP_URL`

**Application Configuration**

- `PROD_NODE_ENV`
- `PROD_PORT`
- `PROD_CORS_ORIGIN`

**Rate Limiting & Security**

- `PROD_THROTTLE_TTL`
- `PROD_THROTTLE_LIMIT`
- `PROD_ACCOUNT_LOCKOUT_ATTEMPTS`
- `PROD_ACCOUNT_LOCKOUT_DURATION`

**Swagger Configuration**

- `PROD_SWAGGER_TITLE`
- `PROD_SWAGGER_DESCRIPTION`
- `PROD_SWAGGER_VERSION`

**External Services**

- `PROD_AWS_S3_HLS_URL`
- `PROD_RAZORPAY_KEY_ID`
- `PROD_RAZORPAY_SECRET`

#### Staging Secrets (STAGING\_\*)

**Database Configuration**

- `STAGING_DB_HOST`
- `STAGING_DB_PORT`
- `STAGING_DB_USERNAME`
- `STAGING_DB_PASSWORD`
- `STAGING_DB_NAME`

**Redis Configuration**

- `STAGING_REDIS_HOST`
- `STAGING_REDIS_PORT`
- `STAGING_REDIS_PASSWORD`

**JWT Configuration**

- `STAGING_JWT_SECRET`
- `STAGING_JWT_EXPIRES_IN`
- `STAGING_JWT_ACCESS_EXPIRES_IN`
- `STAGING_JWT_REFRESH_EXPIRES_IN`
- `STAGING_JWT_ISSUER`
- `STAGING_JWT_AUDIENCE`
- `STAGING_JWT_ALGORITHM`

**Email Configuration**

- `STAGING_SMTP_HOST`
- `STAGING_SMTP_PORT`
- `STAGING_SMTP_SECURE`
- `STAGING_SMTP_USER`
- `STAGING_SMTP_PASS`
- `STAGING_EMAIL_FROM_NAME`
- `STAGING_EMAIL_FROM_EMAIL`
- `STAGING_EMAIL_BASE_URL`
- `STAGING_EMAIL_APP_NAME`
- `STAGING_EMAIL_APP_URL`

**Application Configuration**

- `STAGING_NODE_ENV`
- `STAGING_PORT`
- `STAGING_CORS_ORIGIN`

**Rate Limiting & Security**

- `STAGING_THROTTLE_TTL`
- `STAGING_THROTTLE_LIMIT`
- `STAGING_ACCOUNT_LOCKOUT_ATTEMPTS`
- `STAGING_ACCOUNT_LOCKOUT_DURATION`

**Swagger Configuration**

- `STAGING_SWAGGER_TITLE`
- `STAGING_SWAGGER_DESCRIPTION`
- `STAGING_SWAGGER_VERSION`

**External Services**

- `STAGING_AWS_S3_HLS_URL`
- `STAGING_RAZORPAY_KEY_ID`
- `STAGING_RAZORPAY_SECRET`

## Deployment Process

### Automatic Deployment

1. **Production**: Push to `main` branch
2. **Staging**: Push to `develop` or `staging` branches

### Manual Deployment

1. Go to Actions tab in GitHub
2. Select the workflow (Deploy to Production/Staging)
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Monitoring and Management

### Service Status

```bash
# Check runner status
sudo systemctl status github-runner-prod
sudo systemctl status github-runner-staging

# Check application status
sudo systemctl status sunoo-backend-prod
sudo systemctl status sunoo-backend-staging

# PM2 status
pm2 status
pm2 logs
```

### Logs

```bash
# Application logs
pm2 logs sunoo-backend-prod
pm2 logs sunoo-backend-staging

# System logs
sudo journalctl -u sunoo-backend-prod -f
sudo journalctl -u sunoo-backend-staging -f

# Log files
tail -f /opt/sunoo-backend/logs/combined.log
tail -f /opt/sunoo-backend-staging/logs/combined.log
```

### Restart Services

```bash
# Restart applications
sudo systemctl restart sunoo-backend-prod
sudo systemctl restart sunoo-backend-staging

# Or using PM2
pm2 restart sunoo-backend-prod
pm2 restart sunoo-backend-staging
```

## Security Features

1. **No Source Code**: All source code is removed after deployment
2. **No Environment Files**: Environment variables are injected during build and removed
3. **Process Isolation**: Each environment runs in separate directories
4. **Firewall**: Only necessary ports are open
5. **Log Rotation**: Logs are automatically rotated to prevent disk space issues

## Troubleshooting

### Common Issues

1. **Runner Not Connecting**

   ```bash
   sudo systemctl restart github-runner-prod
   sudo systemctl restart github-runner-staging
   ```

2. **Application Not Starting**

   ```bash
   pm2 logs sunoo-backend-prod
   sudo journalctl -u sunoo-backend-prod
   ```

3. **Port Already in Use**

   ```bash
   sudo lsof -i :3005
   sudo lsof -i :3006
   ```

4. **Permission Issues**
   ```bash
   sudo chown -R deploy:deploy /opt/sunoo-backend*
   ```

### Health Checks

- Production: `http://your-vps-ip:3005/health`
- Staging: `http://your-vps-ip:3006/health`
- API Docs: `http://your-vps-ip:3005/api` (Production)
- API Docs: `http://your-vps-ip:3006/api` (Staging)

## Environment-Specific Configuration

### Production

- Port: 3005
- Process: Cluster mode with max instances
- Logging: Full logging enabled
- Health checks: Enabled
- Auto-restart: Enabled

### Staging

- Port: 3006
- Process: Cluster mode with max instances
- Logging: Full logging enabled
- Health checks: Enabled
- Auto-restart: Enabled

## Backup and Recovery

### Database Backups

```bash
# Create database backup
pg_dump -h your-db-host -U your-username -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -h your-db-host -U your-username -d your-database < backup_file.sql
```

### Application Rollback

```bash
# Stop current version
sudo systemctl stop sunoo-backend-prod

# Restore from backup (if you have one)
# Or redeploy previous version from GitHub

# Start application
sudo systemctl start sunoo-backend-prod
```

## Performance Optimization

1. **PM2 Cluster Mode**: Utilizes all CPU cores
2. **Memory Management**: Automatic restart on memory limit
3. **Log Rotation**: Prevents disk space issues
4. **Health Monitoring**: Automatic restart on failure
5. **Process Isolation**: Separate processes for each environment

## Maintenance

### Regular Tasks

1. Monitor disk space: `df -h`
2. Check memory usage: `free -h`
3. Review logs for errors
4. Update system packages: `sudo apt update && sudo apt upgrade`
5. Restart services if needed

### Updates

1. Update Node.js: Follow NodeSource instructions
2. Update PM2: `sudo npm update -g pm2`
3. Update runners: Download latest from GitHub Actions releases
