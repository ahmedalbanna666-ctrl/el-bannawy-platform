import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
}));
