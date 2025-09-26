import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
  },

  // Account lockout settings
  lockout: {
    maxAttempts: 10, // Increased from 5
    lockoutDuration: 5 * 60 * 1000, // 5 minutes (reduced from 15)
    resetAttemptsAfter: 15 * 60 * 1000, // 15 minutes (reduced from 30)
  },

  // JWT settings
  jwt: {
    accessTokenExpiry: '15m', // 15 minutes
    refreshTokenExpiry: '7d', // 7 days
    issuer: process.env.JWT_ISSUER || 'sunoo-backend',
    audience: process.env.JWT_AUDIENCE || 'sunoo-app',
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs (increased from 100)
    authWindowMs: 5 * 60 * 1000, // 5 minutes for auth endpoints
    authMax: 20, // limit auth endpoints to 20 requests per 5 minutes (increased from 10)
  },

  // Email verification
  emailVerification: {
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    resendCooldown: 60 * 1000, // 1 minute
  },

  // Password reset
  passwordReset: {
    tokenExpiry: 60 * 60 * 1000, // 60 minutes (increased from 30)
    maxAttempts: 5, // Increased from 3
    cooldownPeriod: 2 * 60 * 1000, // 2 minutes (reduced from 5)
  },

  // Security headers
  headers: {
    contentSecurityPolicy: "default-src 'self'",
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  },
}));
