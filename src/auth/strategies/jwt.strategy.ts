import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    const securityConfig = configService.get('security');
    const jwtConfig = securityConfig?.jwt;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig?.secret || configService.get<string>('JWT_SECRET'),
      issuer: jwtConfig?.issuer,
      audience: jwtConfig?.audience,
      algorithms: [jwtConfig?.algorithm || 'HS256'],
    });
  }

  async validate(payload: any) {
    const user = await this.authService.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
