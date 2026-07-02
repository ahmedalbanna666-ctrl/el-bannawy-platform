import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback } from "passport-google-oauth20";

interface GoogleProfile {
  readonly id: string;
  readonly emails: { readonly value: string; readonly verified: boolean }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4000/api/v1/auth/google/callback",
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
