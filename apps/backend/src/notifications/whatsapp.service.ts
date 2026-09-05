import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/services/encryption.service";

export interface WhatsAppSendResult {
  readonly success: boolean;
  readonly error?: string;
  readonly id: string;
  readonly externalId?: string;
}

export interface WhatsAppPublicConfig {
  readonly provider: string;
  readonly phoneNumber: string | null;
  readonly isEnabled: boolean;
  readonly apiUrl: string | null;
  readonly hasAccountSid: boolean;
  readonly hasAuthToken: boolean;
  readonly hasApiKey: boolean;
}

interface WhatsAppConfigRow {
  readonly id: string;
  readonly provider: string;
  readonly accountSid: string | null;
  readonly authToken: string | null;
  readonly phoneNumber: string | null;
  readonly apiKey: string | null;
  readonly apiUrl: string | null;
  readonly isEnabled: boolean;
}

const SECRET_FIELDS: readonly string[] = ["accountSid", "authToken", "apiKey"];

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getConfig(): Promise<WhatsAppPublicConfig> {
    const existingConfig = await this.prisma.whatsAppConfig.findFirst();
    const config = existingConfig ?? (await this.prisma.whatsAppConfig.create({ data: {} }));
    return this.toPublicConfig(config);
  }

  async updateConfig(dto: Record<string, unknown>): Promise<WhatsAppPublicConfig> {
    const existingConfig = await this.prisma.whatsAppConfig.findFirst();
    const config = existingConfig ?? (await this.prisma.whatsAppConfig.create({ data: {} }));

    const updateData: Record<string, unknown> = {};
    const allowedFields = ["provider", "accountSid", "authToken", "phoneNumber", "apiKey", "apiUrl", "isEnabled", "webhookSecret"];
    for (const field of allowedFields) {
      const value = dto[field];
      if (value === undefined) continue;
      if (SECRET_FIELDS.includes(field)) {
        // Secrets are stored encrypted. null clears, empty string leaves unchanged.
        if (value === null) {
          updateData[field] = null;
          continue;
        }
        if (typeof value !== "string" || value.length === 0) continue;
        updateData[field] = this.encryption.encrypt(value);
        continue;
      }
      updateData[field] = value;
    }

    const updated = await this.prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    return this.toPublicConfig(updated);
  }

  async getLogs(page = 1, limit = 20): Promise<unknown> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.whatsAppMessage.count(),
    ]);
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async sendTestMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    const config = await this.prisma.whatsAppConfig.findFirst();
    const logEntry = await this.prisma.whatsAppMessage.create({
      data: {
        to: normalizedTo,
        message,
        status: "PENDING",
      },
    });

    if (!config?.isEnabled) {
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", error: "WhatsApp is not enabled" },
      });
      return { success: false, error: "واتس آب غير مفعل", id: logEntry.id };
    }

    try {
      const result = await this.sendViaProvider(config, normalizedTo, message);
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "SENT", externalId: result.externalId, sentAt: new Date() },
      });
      return { success: true, id: logEntry.id, externalId: result.externalId };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", error: errorMsg },
      });
      return { success: false, error: errorMsg, id: logEntry.id };
    }
  }

  /**
   * Normalizes a phone number to E.164-ish format for WhatsApp providers.
   * Egyptian national mobiles (01xxxxxxxxx) become +20xxxxxxxxxx.
   */
  private normalizePhoneNumber(raw: string): string {
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 0) return raw.trim();
    // International call prefix (e.g. 00201...) -> country code form.
    if (digits.startsWith("00")) digits = digits.slice(2);
    // Egyptian national mobile (01xxxxxxxxx) -> +20xxxxxxxxxx.
    if (/^0\d{10}$/.test(digits)) return `+20${digits.slice(1)}`;
    return `+${digits}`;
  }

  private decryptSecret(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) return value;
    try {
      return this.encryption.decrypt(value);
    } catch {
      // Legacy plaintext values stored before encryption was introduced.
      return value;
    }
  }

  private toPublicConfig(config: WhatsAppConfigRow): WhatsAppPublicConfig {
    return {
      provider: config.provider,
      phoneNumber: config.phoneNumber,
      isEnabled: config.isEnabled,
      apiUrl: config.apiUrl,
      hasAccountSid: config.accountSid !== null,
      hasAuthToken: config.authToken !== null,
      hasApiKey: config.apiKey !== null,
    };
  }

  private async sendViaProvider(
    config: WhatsAppConfigRow,
    to: string,
    message: string,
  ): Promise<{ externalId: string }> {
    const accountSid = this.decryptSecret(config.accountSid);
    const authToken = this.decryptSecret(config.authToken);
    const apiKey = this.decryptSecret(config.apiKey);

    if (config.apiUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const bodyObj: Record<string, unknown> = { to, message };
      if (config.phoneNumber) bodyObj.phoneNumber = config.phoneNumber;

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyObj),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Provider returned ${String(response.status)}: ${body}`);
      }

      const responseBody = (await response.json()) as { id?: string };
      return { externalId: responseBody.id ?? "unknown" };
    }

    // Twilio via REST API (no Twilio package needed)
    if (config.provider === "twilio" && accountSid && authToken && config.phoneNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const twilioBody = new URLSearchParams({
        From: `whatsapp:${config.phoneNumber}`,
        To: `whatsapp:${to}`,
        Body: message,
      });

      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody.toString(),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Twilio returned ${String(response.status)}: ${body}`);
      }

      const result = (await response.json()) as { sid: string };
      return { externalId: result.sid };
    }

    throw new Error(`WhatsApp provider "${config.provider}" not configured. Set API URL or configure Twilio.`);
  }
}
