export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  publicBaseUrl: string;
  corsOrigins: string[];
}

export interface EmailConfig {
  /** Brevo (Sendinblue) API v3 key. Empty disables real sending (dev fallback logs the code). */
  brevoApiKey: string;
  /** Verified sender email on Brevo. */
  brevoSenderEmail: string;
  /** Sender display name. */
  brevoSenderName: string;
  /** Firebase Auth project config for verifying Firebase ID tokens. */
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
  applePrivateKey: string;
  appleCallbackUrl: string;
}

export interface PaymentGatewayProviderConfig {
  apiKey?: string;
  secret?: string;
  merchantId?: string;
  baseUrl?: string;
  integrationIds?: number[];
}

export interface PaymentConfig {
  webhookSecret: string;
  simulationKey?: string;
  publicBaseUrl: string;
  paymob: PaymentGatewayProviderConfig;
  fawry: PaymentGatewayProviderConfig;
  instapay: PaymentGatewayProviderConfig;
  vodafone: PaymentGatewayProviderConfig;
  orange: PaymentGatewayProviderConfig;
  etisalat: PaymentGatewayProviderConfig;
}

export interface AiConfig {
  apiKey: string;
  model: string;
  endpoint: string;
}

export interface FireAuthConfig {
  /** Whether Firebase Auth token verification is enabled (credentials present). */
  enabled: boolean;
}

export interface ZoomConfig {
  /** Zoom account-level OAuth app Client ID (used for REST API + SDK signature when SDK credentials are absent). */
  clientId: string;
  /** Zoom account-level OAuth app Client Secret. */
  clientSecret: string;
  /** Meeting SDK Key (used for in-browser SDK signature generation when provided). */
  sdkKey: string;
  /** Meeting SDK Secret (used for in-browser SDK signature generation when provided). */
  sdkSecret: string;
  /** OAuth base URL used to mint access tokens. */
  oauthBaseUrl: string;
  /** Zoom OAuth authorize URL used to start the authorization-code flow. */
  authorizeBaseUrl: string;
  /** Zoom OAuth redirect URI (must match the app's allowlisted redirect URL). */
  redirectUri: string;
  /** Zoom REST API base URL. */
  apiBaseUrl: string;
  /** Meeting SDK signature endpoint. */
  sdkSignatureUrl: string;
  /** Signature time-to-live in seconds. */
  signatureTtlSeconds: number;
}
