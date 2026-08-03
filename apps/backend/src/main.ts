import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { existsSync } from "fs";

const envPaths = [
  path.resolve(__dirname, "..", "..", "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "..", ".env"),
];
for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import { randomUUID } from "node:crypto";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded, static as expressStatic, type Request, type Response, type NextFunction } from "express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  process.on("unhandledRejection", (reason) => {
    Logger.error(`Unhandled Rejection: ${String(reason)}`, "Bootstrap");
  });
  process.on("uncaughtException", (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`, "Bootstrap");
  });

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>("FRONTEND_URL");
  const nodeEnv = configService.get<string>("NODE_ENV", "development");

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const correlationId = (req.headers["x-correlation-id"] as string | undefined) ?? randomUUID();
    (req as unknown as Record<string, string | undefined>)["x-correlation-id"] = correlationId;
    next();
  });

  const corsOrigins = new Set<string>(
    configService
      .get<string>("CORS_ORIGINS", "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
      .concat(frontendUrl ? [frontendUrl] : []),
  );

  if (nodeEnv === "development") {
    corsOrigins.add("http://localhost:3000");
    corsOrigins.add("http://localhost:3001");
    corsOrigins.add("http://127.0.0.1:3000");
    corsOrigins.add("http://127.0.0.1:3001");
  }

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.has(requestOrigin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://www.youtube.com",
            "https://s.ytimg.com",
            "https://cdn.plyr.io",
            "https://app.sdk.zoom.us",
          ],
          frameSrc: [
            "'self'",
            "https://www.youtube.com",
            "https://www.youtube-nocookie.com",
            "https://app.zoom.us",
            "https://zoom.us",
            "https://*.zoom.us",
            "blob:",
          ],
          workerSrc: ["'self'", "blob:", "https://app.sdk.zoom.us", "https://*.zoom.us"],
          connectSrc: [
            "'self'",
            "https://www.youtube.com",
            "https://app.sdk.zoom.us",
            "https://*.zoom.us",
            "https://zoom.us",
            "wss://*.zoom.us",
            "https://*.web.zoom.us",
            "wss://*.web.zoom.us",
          ],
          imgSrc: ["'self'", "data:", "https://i.ytimg.com", "https://img.youtube.com", "https://*.zoom.us"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.plyr.io", "https://*.zoom.us", "https://app.sdk.zoom.us"],
          fontSrc: ["'self'", "data:", "https://*.zoom.us", "https://app.sdk.zoom.us"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "blob:", "https://*.zoom.us"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
    }),
  );
  const cookieSecret = configService.get<string>("COOKIE_SECRET", "");
  if (nodeEnv === "production" && !cookieSecret) {
    throw new Error("COOKIE_SECRET is required in production");
  }
  app.use(cookieParser(cookieSecret || "el-bannawy-cookie-secret"));

  app.setGlobalPrefix("api/v1");

  const uiUploadDir = path.resolve(process.cwd(), "uploads", "ui");
  if (!existsSync(uiUploadDir)) {
    fs.mkdirSync(uiUploadDir, { recursive: true });
  }
  app.use("/files/ui", expressStatic(uiUploadDir));

  const certificatesUploadDir = path.resolve(process.cwd(), "uploads", "certificates");
  if (!existsSync(certificatesUploadDir)) {
    fs.mkdirSync(certificatesUploadDir, { recursive: true });
  }
  app.use("/files/certificates", expressStatic(certificatesUploadDir));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>("PORT", 4000);
  await app.listen(port);
  Logger.log(`Backend running on http://localhost:${String(port)}`, "Bootstrap");
}

void bootstrap();
