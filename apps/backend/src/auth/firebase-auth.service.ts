import { Injectable, Logger, UnauthorizedException, OnModuleInit } from "@nestjs/common";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import type { DecodedIdToken } from "firebase-admin/auth";
import { ConfigurationService } from "../config/configuration.service";

export interface VerifiedFirebaseToken {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

let firebaseAuthApp: App | undefined;

@Injectable()
export class FirebaseAuthService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAuthService.name);

  constructor(private readonly config: ConfigurationService) {}

  onModuleInit(): void {
    const { firebaseProjectId, firebaseClientEmail, firebasePrivateKey } = this.config.email;

    if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
      this.logger.warn("Firebase Auth credentials not configured. Firebase login disabled.");
      return;
    }

    if (getApps().length === 0) {
      firebaseAuthApp = initializeApp({
        credential: cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey.replace(/\\n/g, "\n"),
        }),
      });
      this.logger.log("Firebase Admin initialized for Authentication");
    }
  }

  isConfigured(): boolean {
    return Boolean(firebaseAuthApp);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    if (!firebaseAuthApp) {
      throw new UnauthorizedException("Firebase login is not configured");
    }

    try {
      const { getAuth } = await import("firebase-admin/auth");
      const decoded: DecodedIdToken = await getAuth(firebaseAuthApp).verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified ?? false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid Firebase token";
      this.logger.warn(`Firebase ID token verification failed: ${msg}`);
      throw new UnauthorizedException("Invalid or expired Firebase session");
    }
  }
}
