# PM2 Configuration Guide

## 🌐 Environment URLs

- **Production**: https://api.sunoo.app (Port 3005)
- **Staging**: https://apidev.sunoo.app (Port 3006)

## 🚀 PM2 Commands

### **Start Applications**

```bash
# Start Production
cd /opt/sunoo-backend
pm2 start ecosystem.config.js --env production

# Start Staging
cd /opt/sunoo-backend-staging
pm2 start ecosystem.config.js --env staging
```

### **Stop Applications**

```bash
# Stop Production
pm2 stop sunoo-backend-prod

# Stop Staging
pm2 stop sunoo-backend-prod --env staging
```

### **Restart Applications**

```bash
# Restart Production
pm2 restart sunoo-backend-prod

# Restart Staging
pm2 restart sunoo-backend-prod --env staging
```

### **Reload Applications (Zero Downtime)**

```bash
# Reload Production
pm2 reload sunoo-backend-prod

# Reload Staging
pm2 reload sunoo-backend-prod --env staging
```

## 📊 Monitoring Commands

### **View Status**

```bash
# View all processes
pm2 status

# View specific process
pm2 show sunoo-backend-prod

# View logs
pm2 logs sunoo-backend-prod

# View logs for staging
pm2 logs sunoo-backend-prod --env staging
```

### **Real-time Monitoring**

```bash
# Monitor dashboard
pm2 monit

# View logs in real-time
pm2 logs --follow

# View logs for specific process
pm2 logs sunoo-backend-prod --follow
```

## 🔧 Configuration Management

### **Save Current Configuration**

```bash
# Save current PM2 processes
pm2 save

# This creates/updates ~/.pm2/dump.pm2
```

### **Resurrect Processes**

```bash
# Restore saved processes
pm2 resurrect

# This loads processes from ~/.pm2/dump.pm2
```

## 🚀 Auto-Start on Server Reboot

### **Setup PM2 Startup (Run Once)**

```bash
# For Production
cd /opt/sunoo-backend
pm2 startup systemd -u deploy --hp /home/deploy

# For Staging
cd /opt/sunoo-backend-staging
pm2 startup systemd -u deploy --hp /home/deploy
```

### **Enable Auto-Start**

```bash
# After setting up startup, save current processes
pm2 save

# This ensures PM2 will restart your apps on server reboot
```

## 📁 Log Management

### **Log Locations**

- **Production Logs**: `/opt/sunoo-backend/logs/`
- **Staging Logs**: `/opt/sunoo-backend-staging/logs/`

### **Log Rotation**

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 🔍 Health Checks

### **Check Application Health**

```bash
# Production health check
curl -f https://api.sunoo.app/health

# Staging health check
curl -f https://apidev.sunoo.app/health
```

### **Check PM2 Status**

```bash
# Check if processes are running
pm2 status

# Check process details
pm2 show sunoo-backend-prod
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Process not starting**:

   ```bash
   pm2 logs sunoo-backend-prod
   ```

2. **High memory usage**:

   ```bash
   pm2 restart sunoo-backend-prod
   ```

3. **Port already in use**:
   ```bash
   pm2 delete sunoo-backend-prod
   pm2 start ecosystem.config.js --env production
   ```

### **Reset PM2**

```bash
# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# Restart from ecosystem.config.js
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

## 📋 Environment Variables

### **Production Environment**

- `NODE_ENV=production`
- `PORT=3005`
- `APP_URL=https://api.sunoo.app`

### **Staging Environment**

- `NODE_ENV=staging`
- `PORT=3006`
- `APP_URL=https://apidev.sunoo.app`

## 🔄 Deployment Workflow

1. **Deploy via GitHub Actions** (automated)
2. **Or manual deployment**:
   ```bash
   # Build and deploy
   npm run build
   pm2 reload sunoo-backend-prod
   ```

## 📊 Performance Monitoring

### **View Resource Usage**

```bash
# Real-time monitoring
pm2 monit

# View process info
pm2 show sunoo-backend-prod
```

### **Memory Management**

```bash
# Restart if memory usage is high
pm2 restart sunoo-backend-prod

# Set memory limit (already configured in ecosystem.config.js)
# max_memory_restart: '1G'
```

## 🎯 Quick Reference

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pm2 status`         | View all processes             |
| `pm2 logs`           | View logs                      |
| `pm2 restart <name>` | Restart process                |
| `pm2 reload <name>`  | Reload process (zero downtime) |
| `pm2 stop <name>`    | Stop process                   |
| `pm2 delete <name>`  | Delete process                 |
| `pm2 save`           | Save current configuration     |
| `pm2 resurrect`      | Restore saved configuration    |
| `pm2 monit`          | Real-time monitoring           |
