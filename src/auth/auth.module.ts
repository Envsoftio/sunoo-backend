import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { SecureAuthService } from './services/secure-auth.service';
import { PasswordValidationService } from './services/password-validation.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { SecureJwtService } from './services/secure-jwt.service';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { EmailModule } from '../email/email.module';
import securityConfig from '../config/security.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Subscription]),
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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    EmailModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    SecureAuthService,
    PasswordValidationService,
    AccountLockoutService,
    SecureJwtService,
    RateLimitService,
    RateLimitGuard,
  ], // GoogleStrategy temporarily disabled
  controllers: [AuthController],
  exports: [AuthService, SecureAuthService],
})
export class AuthModule {}
