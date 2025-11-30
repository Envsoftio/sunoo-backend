import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';
import { Plan } from '../entities/plan.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionController } from './controllers/session.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { PasswordValidationService } from './services/password-validation.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { SecureJwtService } from './services/secure-jwt.service';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SessionService } from './services/session.service';
import { EmailModule } from '../email/email.module';
import { CountryDetectionService } from '../common/services/country-detection.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Subscription, UserSession, Plan]),
    PassportModule,
    // ThrottlerModule disabled for development - using custom RateLimitGuard instead
    // ThrottlerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => {
    //     const securityConfig = configService.get('security');
    //     return {
    //       throttlers: [
    //         {
    //           ttl: securityConfig?.rateLimit?.windowMs || 60000,
    //           limit: securityConfig?.rateLimit?.max || 100,
    //         },
    //       ],
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn:
              configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '24h',
            issuer: configService.get<string>('JWT_ISSUER'),
            audience: configService.get<string>('JWT_AUDIENCE'),
            algorithm: (configService.get<string>('JWT_ALGORITHM') ||
              'HS256') as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    EmailModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    PasswordValidationService,
    AccountLockoutService,
    SecureJwtService,
    RateLimitService,
    RateLimitGuard,
    SessionService,
    CountryDetectionService,
  ],
  controllers: [AuthController, SessionController, AnalyticsController],
  exports: [AuthService, SessionService, RateLimitService, RateLimitGuard],
})
export class AuthModule {}
