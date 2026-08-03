import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback } from "passport-google-oauth20";
import { ConfigurationService } from "../../config/configuration.service";

interface GoogleProfile {
  readonly id: string;
  readonly emails: { readonly value: string; readonly verified: boolean }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigurationService) {
    const clientId = config.auth.googleClientId;
    const clientSecret = config.auth.googleClientSecret;

    if (!clientId || !clientSecret) {
      Logger.warn("Google OAuth credentials not configured. Google login disabled.", "GoogleStrategy");
      super({
        clientID: "unconfigured",
        clientSecret: "unconfigured",
        callbackURL: config.auth.googleCallbackUrl,
        scope: ["email", "profile"],
      });
      return;
    }

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: config.auth.googleCallbackUrl,
      scope: ["email", "profile"],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails[0]?.value ?? null;
    const googleId = profile.id;

    done(null, { email, googleId });
  }
}
