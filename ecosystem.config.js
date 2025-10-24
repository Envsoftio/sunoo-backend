module.exports = {
  apps: [
    {
      name: 'sunoo-backend-prod',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        // Production URL
        APP_URL: 'https://api.sunoo.app',
        // Timezone configuration
        TZ: 'Asia/Kolkata',
        // Logging for production - use relative paths
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        log_date_format: 'DD-MM-YYYY HH:mm:ss',
        // Winston logging configuration - concise logging for production
        LOG_LEVEL: 'warn',
      },
      // PM2 configuration
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Default logging (will be overridden by env-specific settings)
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'DD-MM-YYYY HH:mm:ss',

      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],

      // Health monitoring
      health_check_grace_period: 3000,

      // Environment-specific settings
      node_args: '--max-old-space-size=1024',

      // Auto restart on crash
      autorestart: true,

      // Kill timeout
      kill_timeout: 5000,

      // Wait for ready signal
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'sunoo-backend-staging',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'staging',
        PORT: 3006,
        // Staging URL
        APP_URL: 'https://apidev.sunoo.app',
        TZ: 'Asia/Kolkata',
        // Logging for staging - use relative paths
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        log_date_format: 'DD-MM-YYYY HH:mm:ss',
        // Winston logging configuration
        LOG_LEVEL: 'warn',
      },
      // PM2 configuration
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Default logging (will be overridden by env-specific settings)
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'DD-MM-YYYY HH:mm:ss',

      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],

      // Health monitoring
      health_check_grace_period: 3000,

      // Environment-specific settings
      node_args: '--max-old-space-size=1024',

      // Auto restart on crash
      autorestart: true,

      // Kill timeout
      kill_timeout: 5000,

      // Wait for ready signal
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'vishnu',
      host: '38.242.210.72',
      ref: 'origin/main',
      repo: 'git@github.com:Envsoftio/sunoo-backend.git',
      path: '/opt/sunoo-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'vishnu',
      host: '38.242.210.72',
      ref: 'origin/develop',
      repo: 'git@github.com:Envsoftio/sunoo-backend.git',
      path: '/opt/sunoo-backend-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};
