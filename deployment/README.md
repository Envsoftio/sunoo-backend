# Deployment Scripts

This folder contains all the deployment and setup scripts for the Sunoo Backend application.

## 📁 Scripts Overview

### **Core Setup Scripts**

#### `setup-vps.sh`

**Purpose**: Initial VPS setup and configuration
**Usage**: `sudo ./setup-vps.sh`
**What it does**:

- Updates system packages
- Creates deployment directories (`/opt/sunoo-backend*`)
- Installs NVM, Node.js 20, PM2, and NestJS CLI for vishnu user
- Sets up GitHub Actions runners
- Configures systemd services
- Sets up log rotation

#### `reset-runners-for-vishnu.sh`

**Purpose**: Reset GitHub Actions runners with vishnu user
**Usage**: `sudo ./reset-runners-for-vishnu.sh`
**What it does**:

- Stops existing runner services
- Removes old runner directories
- Downloads fresh GitHub Actions runners
- Configures runners for vishnu user
- Sets up systemd services

### **Web Server & SSL Scripts**

#### `nginx-setup.sh`

**Purpose**: Install and configure Nginx with SSL
**Usage**: `sudo ./nginx-setup.sh`
**What it does**:

- Installs Nginx
- Configures reverse proxy for production and staging
- Sets up SSL certificates with Let's Encrypt
- Configures security headers
- Sets up domain routing

#### `ssl-setup.sh`

**Purpose**: Standalone SSL certificate setup
**Usage**: `sudo ./ssl-setup.sh`
**What it does**:

- Checks domain accessibility
- Installs Certbot
- Obtains SSL certificates
- Configures automatic renewal

### **Security Scripts**

#### `firewall-setup-secure.sh`

**Purpose**: Configure UFW firewall with minimal open ports
**Usage**: `sudo ./firewall-setup-secure.sh`
**What it does**:

- Enables UFW firewall
- Opens only necessary ports (22, 443, 3005, 3006, 6379)
- Closes ports 80, 5432, 3306, 8080
- Provides security-focused configuration

## 🚀 **Deployment Workflow**

### **1. Initial VPS Setup**

```bash
# Run on VPS
sudo ./deployment/setup-vps.sh
```

### **2. Setup GitHub Actions Runners**

```bash
# Run on VPS
sudo ./deployment/reset-runners-for-vishnu.sh
```

### **3. Configure Nginx & SSL**

```bash
# Run on VPS
sudo ./deployment/nginx-setup.sh
```

### **4. Setup Firewall**

```bash
# Run on VPS
sudo ./deployment/firewall-setup-secure.sh
```

### **5. Deploy Applications**

```bash
# From local machine - trigger GitHub Actions
git push origin main    # Production
git push origin develop # Staging
```

### **6. Check Status**

```bash
# Run on VPS
./deployment/check-deployment-status.sh
```

## 📋 **Environment Configuration**

### **Production**

- **URL**: `https://api.sunoo.app`
- **Port**: 3005
- **Directory**: `/opt/sunoo-backend`

### **Staging**

- **URL**: `https://apidev.sunoo.app`
- **Port**: 3006
- **Directory**: `/opt/sunoo-backend-staging`

## 🔧 **Troubleshooting**

### **Common Issues**

1. **PM2 not found**:

   ```bash
   # Source NVM and check PM2
   sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pm2 --version'
   ```

2. **NestJS CLI not found**:

   ```bash
   # Install globally for vishnu user
   sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npm install -g @nestjs/cli'
   ```

3. **Permission issues**:

   ```bash
   # Fix permissions
   sudo chown -R vishnu:vishnu /opt/sunoo-backend*
   sudo chmod -R 755 /opt/sunoo-backend*
   ```

4. **Check deployment status**:

   ```bash
   # Check PM2 processes
   sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pm2 list'

   # Check Nginx status
   sudo systemctl status nginx

   # Check firewall
   sudo ufw status verbose
   ```

## 📚 **Additional Resources**

- **GitHub Actions**: `.github/workflows/`
- **PM2 Configuration**: `ecosystem.config.js`
- **Environment Variables**: `DEPLOYMENT.md`
- **DNS Setup**: `DNS_SETUP.md`

## 🎯 **Quick Commands**

```bash
# Check PM2 processes
sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pm2 list'

# Restart PM2 processes
sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pm2 restart all'

# Check PM2 logs
sudo -u vishnu bash -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pm2 logs'

# Check Nginx status
sudo systemctl status nginx

# Check firewall
sudo ufw status verbose
```
