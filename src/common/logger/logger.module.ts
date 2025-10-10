import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerInterceptor } from './logger.interceptor';
import { LoggerGuard } from './logger.guard';
import { DatabaseLoggerService } from './database-logger.service';

@Global()
@Module({
  providers: [
    LoggerService,
    LoggerInterceptor,
    LoggerGuard,
    DatabaseLoggerService,
  ],
  exports: [
    LoggerService,
    LoggerInterceptor,
    LoggerGuard,
    DatabaseLoggerService,
  ],
})
export class LoggerModule {}
