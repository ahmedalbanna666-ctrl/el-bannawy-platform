import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig, AuthConfig, PaymentConfig, AiConfig, ZoomConfig, EmailConfig } from "./interfaces";

@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig {
    return {
      port: this.configService.get<number>("PORT", 4000),
      nodeEnv: this.configService.get<string>("NODE_ENV", "development"),
      frontendUrl: this.configService.get<string>("FRONTEND_URL", "http://localhost:3000"),
      publicBaseUrl: this.configService.get<string>("PUBLIC_BASE_URL", "http://localhost:4000"),
      corsOrigins: (this.configService.get<string>("CORS_ORIGINS", "") ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    };
  }

  get auth(): AuthConfig {
    return {
      jwtSecret: this.configService.get<string>("JWT_SECRET")!,
      jwtExpiry: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
      googleClientId: this.configService.get<string>("GOOGLE_CLIENT_ID", ""),
      googleClientSecret: this.configService.get<string>("GOOGLE_CLIENT_SECRET", ""),
      googleCallbackUrl: this.configService.get<string>(
        "GOOGLE_CALLBACK_URL",
        "http://localhost:4000/api/v1/auth/google/callback",
      ),
      appleClientId: this.configService.get<string>("APPLE_CLIENT_ID", ""),
      appleTeamId: this.configService.get<string>("APPLE_TEAM_ID", ""),
      appleKeyId: this.configService.get<string>("APPLE_KEY_ID", ""),
      applePrivateKey: this.configService.get<string>("APPLE_PRIVATE_KEY", ""),
      appleCallbackUrl: this.configService.get<string>(
        "APPLE_CALLBACK_URL",
        "http://localhost:4000/api/v1/auth/apple/callback",
      ),
    };
  }

  get payment(): PaymentConfig {
    return {
      webhookSecret: this.configService.get<string>("PAYMENT_WEBHOOK_SECRET")!,
      simulationKey: this.configService.get<string>("SIMULATION_HMAC_KEY"),
      publicBaseUrl: this.configService.get<string>("PUBLIC_BASE_URL", "http://localhost:4000"),
      paymob: {
        apiKey: this.configService.get<string>("PAYMOB_API_KEY"),
        secret: this.configService.get<string>("PAYMOB_HMAC_SECRET"),
        merchantId: this.configService.get<string>("PAYMOB_MERCHANT_ID"),
        baseUrl: this.configService.get<string>("PAYMOB_BASE_URL"),
        integrationIds: (this.configService.get<string>("PAYMOB_INTEGRATION_IDS", "") ?? "")
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isFinite(v) && v > 0),
      },
      fawry: {
        merchantId: this.configService.get<string>("FAWRY_MERCHANT_CODE"),
        secret: this.configService.get<string>("FAWRY_SECURITY_KEY"),
        baseUrl: this.configService.get<string>("FAWRY_BASE_URL"),
      },
      instapay: {
        apiKey: this.configService.get<string>("INSTAPAY_API_KEY"),
        baseUrl: this.configService.get<string>("INSTAPAY_BASE_URL"),
      },
      vodafone: {
        merchantId: this.configService.get<string>("VODAFONE_CASH_MERCHANT_ID"),
        secret: this.configService.get<string>("VODAFONE_CASH_SECRET"),
        baseUrl: this.configService.get<string>("VODAFONE_CASH_BASE_URL"),
      },
      orange: {
        merchantId: this.configService.get<string>("ORANGE_CASH_MERCHANT_ID"),
        secret: this.configService.get<string>("ORANGE_CASH_SECRET"),
        baseUrl: this.configService.get<string>("ORANGE_CASH_BASE_URL"),
      },
      etisalat: {
        merchantId: this.configService.get<string>("ETISALAT_CASH_MERCHANT_ID"),
        secret: this.configService.get<string>("ETISALAT_CASH_SECRET"),
        baseUrl: this.configService.get<string>("ETISALAT_CASH_BASE_URL"),
      },
    };
  }

  get ai(): AiConfig {
    return {
      apiKey: this.configService.get<string>("AI_API_KEY", ""),
      model: this.configService.get<string>("AI_MODEL", "gpt-4o-mini"),
      endpoint: this.configService.get<string>("AI_ENDPOINT", "https://api.openai.com/v1/chat/completions"),
    };
  }

  get zoom(): ZoomConfig {
    return {
      clientId: this.configService.get<string>("ZOOM_CLIENT_ID", ""),
      clientSecret: this.configService.get<string>("ZOOM_CLIENT_SECRET", ""),
      sdkKey: this.configService.get<string>("ZOOM_SDK_KEY", ""),
      sdkSecret: this.configService.get<string>("ZOOM_SDK_SECRET", ""),
      oauthBaseUrl: this.configService.get<string>("ZOOM_OAUTH_BASE_URL", "https://zoom.us/oauth/token"),
      authorizeBaseUrl: this.configService.get<string>("ZOOM_AUTHORIZE_BASE_URL", "https://zoom.us/oauth/authorize"),
      redirectUri: this.configService.get<string>("ZOOM_REDIRECT_URI", ""),
      apiBaseUrl: this.configService.get<string>("ZOOM_API_BASE_URL", "https://api.zoom.us/v2"),
      sdkSignatureUrl: this.configService.get<string>("ZOOM_SDK_SIGNATURE_URL", "https://zoom.us/sdk/signature"),
      signatureTtlSeconds: Number(this.configService.get<string>("ZOOM_SIGNATURE_TTL_SECONDS", "7200")),
    };
  }

  get email(): EmailConfig {
    return {
      brevoApiKey: this.configService.get<string>("BREVO_API_KEY", ""),
      brevoSenderEmail: this.configService.get<string>("BREVO_SENDER_EMAIL", ""),
      brevoSenderName: this.configService.get<string>("BREVO_SENDER_NAME", "El-bannawy Platform"),
      firebaseProjectId: this.configService.get<string>("NEXT_PUBLIC_FIREBASE_PROJECT_ID", ""),
      firebaseClientEmail: this.configService.get<string>("FIREBASE_CLIENT_EMAIL", ""),
      firebasePrivateKey: this.configService.get<string>("FIREBASE_PRIVATE_KEY", ""),
    };
  }
}
