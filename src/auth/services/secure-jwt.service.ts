import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  role: string;
  jti?: string; // JWT ID for refresh token
  type: 'access' | 'refresh';
}

@Injectable()
export class SecureJwtService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateTokenPair(user: { id: string; email: string; role: string }): TokenPair {
    const securityConfig = this.configService.get('security');
    const jwtConfig = securityConfig.jwt;

    const jti = uuidv4();
    const now = new Date();
    const accessExpiry = new Date(now.getTime() + this.parseExpiry(jwtConfig.accessTokenExpiry));
    const refreshExpiry = new Date(now.getTime() + this.parseExpiry(jwtConfig.refreshTokenExpiry));

    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExpiry,
    };
  }

  generateAccessToken(user: { id: string; email: string; role: string }): string {
    const securityConfig = this.configService.get('security');
    const jwtConfig = securityConfig.jwt;

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = this.jwtService.verify(token) as TokenPayload;
      return payload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const payload = this.jwtService.verify(token) as TokenPayload;
      if (payload.type !== 'refresh') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = this.jwtService.verify(token, { ignoreExpiration: true });
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  getTokenExpiry(token: string): Date | null {
    try {
      const payload = this.jwtService.verify(token, { ignoreExpiration: true });
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid expiry unit: ${unit}`);
    }
  }
}
