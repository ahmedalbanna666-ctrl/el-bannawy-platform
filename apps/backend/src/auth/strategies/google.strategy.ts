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
        state: false,
        proxy: true,
      });
      return;
    }

    Logger.log(`GoogleStrategy init: callbackURL=${config.auth.googleCallbackUrl} clientID=${clientId.slice(0, 8)}...`, "GoogleStrategy");
    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: config.auth.googleCallbackUrl,
      scope: ["email", "profile"],
      state: false,
      proxy: true,
    });
  }

  override authenticate(req: Parameters<Strategy["authenticate"]>[0], options?: Parameters<Strategy["authenticate"]>[1]): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const cid = (req as unknown as { headers?: Record<string, string> }).headers?.["x-correlation-id"] ?? "-";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    Logger.warn(
      `GoogleStrategy authenticate: cid=${cid} url=${(req as { url?: string }).url ?? ""} query=${JSON.stringify((req as unknown as { query: unknown }).query)}`,
      "GoogleStrategy",
    );
    super.authenticate(req, options);
  }

  override userProfile(accessToken: string, done: (err: unknown, profile?: unknown) => void): void {
    super.userProfile(accessToken, (err: unknown, profile: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
        Logger.warn(`GoogleStrategy userProfile error: ${msg}`, "GoogleStrategy");
      } else {
        Logger.log(`GoogleStrategy userProfile success: ${JSON.stringify(profile)}`, "GoogleStrategy");
      }
      done(err, profile);
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    Logger.log(`GoogleStrategy validate: id=${profile.id} emails=${JSON.stringify(profile.emails)}`, "GoogleStrategy");
    const email = profile.emails[0]?.value ?? null;
    const googleId = profile.id;

    done(null, { email, googleId });
  }
}
