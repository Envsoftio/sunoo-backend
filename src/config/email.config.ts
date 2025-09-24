import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.zeptomail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'emailapikey',
      pass:
        process.env.SMTP_PASS ||
        'wSsVR60g+EH3DPh4zzX8Lu07zw4DD16kEkko2QOl73OoSquQ8sczwkPKBg7yFaBJGG9vHTYU8r8pyhxS0jQG24t4wlhUDiiF9mqRe1U4J3x17qnvhDzMX25flBaOL4MOwAhqk2RmEM0h+g==',
    },
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Sunoo Team',
    email: process.env.EMAIL_FROM_EMAIL || 'noreply@sunoo.app',
  },
  templates: {
    baseUrl: process.env.EMAIL_BASE_URL || 'http://localhost:3005',
    appName: process.env.EMAIL_APP_NAME || 'Sunoo',
    appUrl: process.env.EMAIL_APP_URL || 'http://localhost:3000',
  },
}));
