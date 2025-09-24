import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Sunoo Backend API',
    description:
      process.env.SWAGGER_DESCRIPTION || 'API documentation for Sunoo Backend',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },
}));
