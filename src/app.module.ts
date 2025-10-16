import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { StoryModule } from './story/story.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GenreModule } from './genre/genre.module';
import { SupportTicketModule } from './support-ticket/support-ticket.module';
import { LoggerModule } from './common/logger/logger.module';
import { DatabaseLoggerService } from './common/logger/database-logger.service';
import { getDatabaseConfig } from './config/database.config';
import { CacheModule } from './cache/cache.module';
import appConfig from './config/app.config';
import securityConfig from './config/security.config';
import emailConfig from './config/email.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, securityConfig, emailConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    CacheModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, LoggerModule],
      useFactory: (
        configService: ConfigService,
        databaseLogger: DatabaseLoggerService
      ) => getDatabaseConfig(configService, databaseLogger),
      inject: [ConfigService, DatabaseLoggerService],
    }),
    LoggerModule,
    AuthModule,
    UsersModule,
    DatabaseModule,
    HealthModule,
    StoryModule,
    SubscriptionModule,
    AdminModule,
    FeedbackModule,
    GenreModule,
    SupportTicketModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseLoggerService],
})
export class AppModule {}
