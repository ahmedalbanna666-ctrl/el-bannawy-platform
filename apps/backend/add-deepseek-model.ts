import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "node:crypto";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const envPaths = [
  path.resolve(__dirname, "..", "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
];
for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "el-bannawy-ai-encryption-salt", 32);
}

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (!secret) {
    if (nodeEnv === "production") {
      throw new Error("AI_ENCRYPTION_KEY is required in production");
    }
    return deriveKey("dev-fallback-key-do-not-use-in-production");
  }
  return deriveKey(secret);
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("ERR: DEEPSEEK_API_KEY env variable is required");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const modelName = "deepseek-v4-flash";
    const baseUrl = "https://opencode.ai/zen/go/v1/chat/completions";

    const existing = await prisma.aiModelConfig.findFirst({
      where: { provider: "OPENAI", modelName },
    });

    if (existing) {
      await prisma.aiModelConfig.update({
        where: { id: existing.id },
        data: {
          apiKey: encrypt(apiKey),
          baseUrl,
          temperature: 0.7,
          maxTokens: 2000,
          timeout: 30,
          isActive: true,
          isEnabled: true,
          priority: 0,
          supportsStreaming: true,
          healthStatus: "UNKNOWN",
          lastError: null,
        },
      });
      console.log(`UPDATED existing config: ${existing.id}`);
    } else {
      await prisma.aiModelConfig.create({
        data: {
          provider: "OPENAI",
          modelName,
          apiKey: encrypt(apiKey),
          baseUrl,
          temperature: 0.7,
          maxTokens: 2000,
          timeout: 30,
          isActive: true,
          isEnabled: true,
          priority: 0,
          supportsStreaming: true,
        },
      });
      console.log("CREATED new config");
    }

    await prisma.aiModelConfig.updateMany({
      where: { modelName: { not: modelName } },
      data: { isActive: false },
    });

    const configs = await prisma.aiModelConfig.findMany({
      orderBy: { priority: "asc" },
      select: {
        id: true,
        provider: true,
        modelName: true,
        baseUrl: true,
        isActive: true,
        isEnabled: true,
        priority: true,
        supportsStreaming: true,
      },
    });
    console.log(JSON.stringify(configs, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error("ERR", e);
  process.exit(1);
});
