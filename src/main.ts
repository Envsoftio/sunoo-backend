import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { JsonExceptionFilter } from './filters/json-exception.filter';
import { LoggerService } from './common/logger/logger.service';
import { LoggerInterceptor } from './common/logger/logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable default NestJS logger
    bodyParser: true, // Enable body parser for JSON
  });

  // Configure body size limit for file uploads (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);
  const loggerInterceptor = app.get(LoggerInterceptor);

  // Set Winston as the global logger
  app.useLogger(loggerService);

  // Use global logger interceptor for all routes
  app.useGlobalInterceptors(loggerInterceptor);

  // Enhanced security middleware
  const securityConfig = configService.get('security');
  app.use(helmet(securityConfig?.headers || {}));
  app.use(compression());

  // Global rate limiting - will be handled by individual modules

  // CORS configuration
  app.enableCors({
    origin: [
      configService.get('app.corsOrigin'),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://sunoodev.netlify.app',
      'https://sunoo.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter for JSON parsing errors
  app.useGlobalFilters(new JsonExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger/OpenAPI configuration - configurable via environment
  if (configService.get('app.enableSwagger')) {
    const config = new DocumentBuilder()
      .setTitle(configService.get('app.swagger.title') || 'Sunoo Backend API')
      .setDescription(
        configService.get('app.swagger.description') ||
          'API documentation for Sunoo Backend'
      )
      .setVersion(configService.get('app.swagger.version') || '1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get('app.port');
  await app.listen(port);

  // Use Winston logger instead of console.log
  loggerService.log(
    `🚀 Application is running on: http://localhost:${port}`,
    'Bootstrap'
  );

  if (configService.get('app.enableSwagger')) {
    loggerService.log(
      `📚 Swagger documentation: http://localhost:${port}/api`,
      'Bootstrap'
    );
  }
}
void bootstrap();
