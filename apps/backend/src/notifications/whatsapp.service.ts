import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/services/encryption.service";

export interface WhatsAppSendResult {
  readonly success: boolean;
  readonly error?: string;
  readonly id: string;
  readonly externalId?: string;
  readonly senderPhone?: string | null;
}

export interface WhatsAppSendOptions {
  readonly gradeId?: string;
}

export interface WhatsAppSenderInfo {
  readonly id: string;
  readonly gradeId: string;
  readonly gradeName: string | null;
  readonly label: string;
  readonly phoneNumber: string;
  readonly isEnabled: boolean;
  readonly apiUrl: string | null;
  readonly hasApiKey: boolean;
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

  async sendTestMessage(to: string, message: string, opts?: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    const config = await this.prisma.whatsAppConfig.findFirst();
    const sender = await this.resolveSender(opts?.gradeId, config);
    const logEntry = await this.prisma.whatsAppMessage.create({
      data: {
        to: normalizedTo,
        senderPhone: sender.fromNumber,
        message,
        status: "PENDING",
      },
    });

    if (!config?.isEnabled) {
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", error: "WhatsApp is not enabled" },
      });
      return { success: false, error: "واتس آب غير مفعل", id: logEntry.id, senderPhone: sender.fromNumber };
    }

    try {
      const result = await this.sendViaProvider(config, normalizedTo, message, sender);
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "SENT", externalId: result.externalId, sentAt: new Date() },
      });
      return { success: true, id: logEntry.id, externalId: result.externalId, senderPhone: sender.fromNumber };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.prisma.whatsAppMessage.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", error: errorMsg },
      });
      return { success: false, error: errorMsg, id: logEntry.id, senderPhone: sender.fromNumber };
    }
  }

  async getSenders(): Promise<WhatsAppSenderInfo[]> {
    const rows = await this.prisma.whatsAppSender.findMany({
      include: { grade: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      gradeId: r.gradeId,
      gradeName: r.grade.name,
      label: r.label,
      phoneNumber: r.phoneNumber,
      isEnabled: r.isEnabled,
      apiUrl: r.apiUrl,
      hasApiKey: r.apiKey !== null,
    }));
  }

  async upsertSenders(dto: Record<string, unknown>): Promise<WhatsAppSenderInfo[]> {
    const rows = dto["senders"];
    if (!Array.isArray(rows)) throw new BadRequestException("senders must be an array");
    for (const row of rows) {
      if (typeof row !== "object" || row === null) throw new BadRequestException("Each sender must be an object");
      const item = row as Record<string, unknown>;
      const gradeId = item["gradeId"];
      if (typeof gradeId !== "string" || gradeId.length === 0) throw new BadRequestException("Each sender requires gradeId");
      const grade = await this.prisma.grade.findUnique({ where: { id: gradeId }, select: { id: true } });
      if (!grade) throw new BadRequestException(`Grade not found: ${gradeId}`);

      const rawPhone = typeof item["phoneNumber"] === "string" ? item["phoneNumber"] : "";
      if (rawPhone.trim().length === 0) {
        await this.prisma.whatsAppSender.deleteMany({ where: { gradeId } });
        continue;
      }
      const phoneNumber = this.normalizePhoneNumber(rawPhone);
      if (!/^\+\d{7,15}$/.test(phoneNumber)) {
        throw new BadRequestException(`Invalid sender phone number for grade ${gradeId}`);
      }

      const label = typeof item["label"] === "string" ? item["label"].slice(0, 120) : "";
      const isEnabled = typeof item["isEnabled"] === "boolean" ? item["isEnabled"] : true;
      const apiUrlRaw = item["apiUrl"];
      const apiUrl = typeof apiUrlRaw === "string" && apiUrlRaw.trim().length > 0 ? apiUrlRaw.trim() : null;
      const apiKeyRaw = item["apiKey"];
      const data: Record<string, unknown> = { gradeId, label, phoneNumber, isEnabled, apiUrl };
      if (apiKeyRaw === null) {
        data["apiKey"] = null;
      } else if (typeof apiKeyRaw === "string" && apiKeyRaw.length > 0) {
        data["apiKey"] = this.encryption.encrypt(apiKeyRaw);
      }
      await this.prisma.whatsAppSender.upsert({
        where: { gradeId },
        create: data as never,
        update: data as never,
      });
    }
    return this.getSenders();
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

  /**
   * Resolves the effective sender for a grade: its dedicated number (and
   * optional provider override), falling back to the default config.
   */
  private async resolveSender(
    gradeId: string | undefined,
    config: WhatsAppConfigRow | null,
  ): Promise<{
    fromNumber: string | null;
    apiUrl: string | null;
    apiKey: string | null | undefined;
  }> {
    let sender: {
      phoneNumber: string;
      isEnabled: boolean;
      apiUrl: string | null;
      apiKey: string | null;
    } | null = null;
    if (gradeId) {
      sender = await this.prisma.whatsAppSender.findUnique({ where: { gradeId } });
    }
    const activeSender = sender && sender.isEnabled ? sender : null;
    // Stored numbers may carry the UI placeholder prefix ("whatsapp:+...") —
    // strip it so the provider never receives a doubled "whatsapp:whatsapp:".
    const rawFrom = activeSender?.phoneNumber ?? config?.phoneNumber ?? null;
    return {
      fromNumber: rawFrom ? rawFrom.replace(/^whatsapp:/i, "") : null,
      apiUrl: activeSender?.apiUrl ?? config?.apiUrl ?? null,
      apiKey:
        activeSender && activeSender.apiKey
          ? this.decryptSecret(activeSender.apiKey)
          : this.decryptSecret(config?.apiKey),
    };
  }

  private async sendViaProvider(
    config: WhatsAppConfigRow,
    to: string,
    message: string,
    sender: { fromNumber: string | null; apiUrl: string | null; apiKey: string | null | undefined },
  ): Promise<{ externalId: string }> {
    const accountSid = this.decryptSecret(config.accountSid);
    const authToken = this.decryptSecret(config.authToken);
    const apiKey = sender.apiKey;
    const apiUrl = sender.apiUrl;
    const fromNumber = sender.fromNumber ?? config.phoneNumber;

    if (apiUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const bodyObj: Record<string, unknown> = { to, message };
      if (fromNumber) bodyObj.phoneNumber = fromNumber;

      const response = await fetch(apiUrl, {
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
    if (config.provider === "twilio" && accountSid && authToken && fromNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const twilioBody = new URLSearchParams({
        From: `whatsapp:${fromNumber}`,
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
