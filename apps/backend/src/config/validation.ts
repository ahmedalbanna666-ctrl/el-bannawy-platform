import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().uri().default("http://localhost:3000"),
  PUBLIC_BASE_URL: Joi.string().uri().default("http://localhost:4000"),
  CORS_ORIGINS: Joi.string().optional().default(""),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  COOKIE_SECRET: Joi.string()
    .min(16)
    .when("NODE_ENV", {
      is: "production",
      then: Joi.required(),
      otherwise: Joi.string().allow("").optional().default(""),
    }),

  GOOGLE_CLIENT_ID: Joi.string().allow("").optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow("").optional(),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .default("http://localhost:4000/api/v1/auth/google/callback"),

  APPLE_CLIENT_ID: Joi.string().allow("").optional(),
  APPLE_TEAM_ID: Joi.string().allow("").optional(),
  APPLE_KEY_ID: Joi.string().allow("").optional(),
  APPLE_PRIVATE_KEY: Joi.string().allow("").optional(),
  APPLE_CALLBACK_URL: Joi.string()
    .uri()
    .default("http://localhost:4000/api/v1/auth/apple/callback"),

  PAYMENT_WEBHOOK_SECRET: Joi.string().min(16).optional().default(""),
  SIMULATION_HMAC_KEY: Joi.string().min(16).optional(),

  PAYMOB_API_KEY: Joi.string().allow("").optional(),
  PAYMOB_HMAC_SECRET: Joi.string().allow("").optional(),
  PAYMOB_MERCHANT_ID: Joi.string().allow("").optional(),
  PAYMOB_BASE_URL: Joi.string().uri().allow("").optional(),
  PAYMOB_INTEGRATION_IDS: Joi.string().allow("").optional(),

  FAWRY_MERCHANT_CODE: Joi.string().allow("").optional(),
  FAWRY_SECURITY_KEY: Joi.string().allow("").optional(),
  FAWRY_BASE_URL: Joi.string().uri().allow("").optional(),

  INSTAPAY_API_KEY: Joi.string().allow("").optional(),
  INSTAPAY_BASE_URL: Joi.string().uri().allow("").optional(),

  VODAFONE_CASH_MERCHANT_ID: Joi.string().allow("").optional(),
  VODAFONE_CASH_SECRET: Joi.string().allow("").optional(),
  VODAFONE_CASH_BASE_URL: Joi.string().uri().allow("").optional(),

  ORANGE_CASH_MERCHANT_ID: Joi.string().allow("").optional(),
  ORANGE_CASH_SECRET: Joi.string().allow("").optional(),
  ORANGE_CASH_BASE_URL: Joi.string().uri().allow("").optional(),

  ETISALAT_CASH_MERCHANT_ID: Joi.string().allow("").optional(),
  ETISALAT_CASH_SECRET: Joi.string().allow("").optional(),
  ETISALAT_CASH_BASE_URL: Joi.string().uri().allow("").optional(),

  AI_API_KEY: Joi.string().allow("").optional(),
  AI_MODEL: Joi.string().default("gpt-4o-mini"),
  AI_ENDPOINT: Joi.string()
    .uri()
    .default("https://api.openai.com/v1/chat/completions"),

  AI_ENCRYPTION_KEY: Joi.string()
    .min(32)
    .when("NODE_ENV", {
      is: "production",
      then: Joi.required(),
      otherwise: Joi.allow("").optional(),
    }),

  ZOOM_CLIENT_ID: Joi.string().allow("").optional(),
  ZOOM_CLIENT_SECRET: Joi.string().allow("").optional(),
  ZOOM_SDK_KEY: Joi.string().allow("").optional(),
  ZOOM_SDK_SECRET: Joi.string().allow("").optional(),
  ZOOM_OAUTH_BASE_URL: Joi.string().uri().optional(),
  ZOOM_API_BASE_URL: Joi.string().uri().optional(),
  ZOOM_SDK_SIGNATURE_URL: Joi.string().uri().optional(),
  ZOOM_SIGNATURE_TTL_SECONDS: Joi.number().min(60).max(86400).optional(),

  BREVO_API_KEY: Joi.string().allow("").optional(),
  BREVO_SENDER_EMAIL: Joi.string().email().allow("").optional(),
  BREVO_SENDER_NAME: Joi.string().allow("").optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow("").optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow("").optional(),
});
