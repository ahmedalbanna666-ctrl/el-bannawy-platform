import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type MulticastMessage, type BatchResponse } from "firebase-admin/messaging";
import { PrismaService } from "../prisma/prisma.service";

let fcmApp: App | undefined;

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn("Firebase Admin credentials not configured. FCM push disabled.");
      return;
    }

    if (getApps().length === 0) {
      fcmApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      this.logger.log("Firebase Admin initialized");
    }
  }

  async sendPush(userId: string, title: string, message: string, data?: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!fcmApp) {
      return { success: false, error: "Firebase Admin not initialized" };
    }

    try {
      const tokens = await this.getUserTokens(userId);
      if (tokens.length === 0) return { success: false, error: "No device tokens" };

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- MulticastMessage with tokens is the standard FCM web push API
      const payload: MulticastMessage = {
        tokens,
        notification: { title, body: message },
        data: data ?? {},
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default", badge: 1 } } },
        webpush: { headers: { Urgency: "high" } },
      };

      const messaging = getMessaging(fcmApp);
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- sendEachForMulticast with tokens is the standard FCM web push API
      const response = await messaging.sendEachForMulticast(payload);

      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(response, tokens);
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown FCM error";
      this.logger.error(`FCM send failed for user ${userId}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async registerToken(userId: string, token: string, platform = "WEB", userAgent?: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform, userAgent },
      create: { userId, token, platform, userAgent },
    });
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({
      where: { userId, token },
    });
  }

  private async getUserTokens(userId: string): Promise<string[]> {
    const records = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return records.map((r) => r.token);
  }

  private async cleanupInvalidTokens(
    response: BatchResponse,
    tokens: string[],
  ): Promise<void> {
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const code = resp.error.code;
        if (code === "messaging/invalid-registration-token"
          || code === "messaging/registration-token-not-registered"
          || code === "messaging/mismatched-credential") {
          invalidTokens.push(tokens[idx]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
      this.logger.warn(`Cleaned up ${String(invalidTokens.length)} invalid tokens`);
    }
  }
}
