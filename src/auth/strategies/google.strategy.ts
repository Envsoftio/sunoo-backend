import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    // Get config values first
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // Call super() with the appropriate config
    if (!clientID || !clientSecret || !callbackURL) {
      super({
        clientID: 'dummy-client-id',
        clientSecret: 'dummy-client-secret',
        callbackURL: 'http://localhost:3005/dummy-callback',
        scope: ['email', 'profile'],
      });
    } else {
      super({
        clientID,
        clientSecret,
        callbackURL,
        scope: ['email', 'profile'],
      });
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      avatar: photos[0].value,
      provider: 'google',
      providerId: profile.id,
    };

    const validatedUser = await this.authService.validateGoogleUser(user);
    done(null, validatedUser);
  }
}
