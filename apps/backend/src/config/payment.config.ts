import { registerAs } from "@nestjs/config";

export default registerAs("payment", () => ({
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  simulationKey: process.env.SIMULATION_HMAC_KEY,
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  paymob: {
    apiKey: process.env.PAYMOB_API_KEY,
    secret: process.env.PAYMOB_HMAC_SECRET,
    merchantId: process.env.PAYMOB_MERCHANT_ID,
    baseUrl: process.env.PAYMOB_BASE_URL,
    integrationIds: (process.env.PAYMOB_INTEGRATION_IDS ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0),
  },
  fawry: {
    merchantId: process.env.FAWRY_MERCHANT_CODE,
    secret: process.env.FAWRY_SECURITY_KEY,
    baseUrl: process.env.FAWRY_BASE_URL,
  },
  instapay: {
    apiKey: process.env.INSTAPAY_API_KEY,
    baseUrl: process.env.INSTAPAY_BASE_URL,
  },
  vodafone: {
    merchantId: process.env.VODAFONE_CASH_MERCHANT_ID,
    secret: process.env.VODAFONE_CASH_SECRET,
    baseUrl: process.env.VODAFONE_CASH_BASE_URL,
  },
  orange: {
    merchantId: process.env.ORANGE_CASH_MERCHANT_ID,
    secret: process.env.ORANGE_CASH_SECRET,
    baseUrl: process.env.ORANGE_CASH_BASE_URL,
  },
  etisalat: {
    merchantId: process.env.ETISALAT_CASH_MERCHANT_ID,
    secret: process.env.ETISALAT_CASH_SECRET,
    baseUrl: process.env.ETISALAT_CASH_BASE_URL,
  },
}));
