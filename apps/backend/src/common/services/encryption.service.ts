import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "el-bannawy-ai-encryption-salt", 32);
}

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly logger = new Logger(EncryptionService.name);

  constructor() {
    const secret = process.env.AI_ENCRYPTION_KEY;
    const nodeEnv = process.env.NODE_ENV ?? "development";

    if (!secret) {
      if (nodeEnv === "production") {
        throw new Error("AI_ENCRYPTION_KEY is required in production");
      }
      this.logger.warn(
        "AI_ENCRYPTION_KEY not set — using development fallback key. DO NOT use in production.",
      );
      this.key = deriveKey("dev-fallback-key-do-not-use-in-production");
    } else {
      this.key = deriveKey(secret);
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length < 3) {
      throw new Error("Invalid encrypted payload format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts.slice(2).join(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  mask(value: string): string {
    if (value.length <= 8) return value.slice(0, 2) + "****";
    return value.slice(0, 4) + "****" + value.slice(-4);
  }
}
