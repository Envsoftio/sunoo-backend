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
import { getDatabaseConfig } from './config/database.config';
import appConfig from './config/app.config';
import securityConfig from './config/security.config';
import emailConfig from './config/email.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, securityConfig, emailConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
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
  providers: [AppService],
})
export class AppModule {}
