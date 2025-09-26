import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  smtp: {
    /* `host: process.env.SMTP_HOST` is retrieving the SMTP host value from the environment variables.
    This allows the application to dynamically configure the SMTP host based on the environment
    where it is running, making the application more flexible and configurable without hardcoding
    values. */
    /* `host: process.env.SMTP_HOST` is retrieving the SMTP host value from the environment variables.
    This allows the application to dynamically configure the SMTP host based on the environment
    where it is running, making the application more flexible and configurable. */
    host: process.env.SMTP_HOST || 'smtp.zeptomail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // Zeptomail uses STARTTLS on port 587, not SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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
