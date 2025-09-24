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
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    resetAttemptsAfter: 30 * 60 * 1000, // 30 minutes
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
    max: 100, // limit each IP to 100 requests per windowMs
    authWindowMs: 5 * 60 * 1000, // 5 minutes for auth endpoints
    authMax: 10, // limit auth endpoints to 10 requests per 5 minutes
  },

  // Email verification
  emailVerification: {
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    resendCooldown: 60 * 1000, // 1 minute
  },

  // Password reset
  passwordReset: {
    tokenExpiry: 30 * 60 * 1000, // 30 minutes
    maxAttempts: 3,
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes
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
