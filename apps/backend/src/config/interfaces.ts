export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  publicBaseUrl: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
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
