import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<unknown> {
    const existingConfig = await this.prisma.whatsAppConfig.findFirst();
    const config = existingConfig ?? await this.prisma.whatsAppConfig.create({ data: {} });
    return {
      provider: config.provider,
      phoneNumber: config.phoneNumber,
      isEnabled: config.isEnabled,
      apiUrl: config.apiUrl,
    };
  }

  async updateConfig(dto: Record<string, unknown>): Promise<unknown> {
    const existingConfig = await this.prisma.whatsAppConfig.findFirst();
    const config = existingConfig ?? await this.prisma.whatsAppConfig.create({ data: {} });

    const updateData: Record<string, unknown> = {};
    const allowedFields = ["provider", "accountSid", "authToken", "phoneNumber", "apiKey", "apiUrl", "isEnabled", "webhookSecret"];
    for (const field of allowedFields) {
      if (dto[field] !== undefined) updateData[field] = dto[field];
    }

    const updated = await this.prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    return {
      provider: updated.provider,
      phoneNumber: updated.phoneNumber,
      isEnabled: updated.isEnabled,
      apiUrl: updated.apiUrl,
    };
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

  async sendTestMessage(to: string, message: string): Promise<unknown> {
    const config = await this.prisma.whatsAppConfig.findFirst();
    const logEntry = await this.prisma.whatsAppMessage.create({
      data: {
        to,
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
      const result = await this.sendViaProvider(config, to, message);
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

  private async sendViaProvider(
    config: { provider: string; accountSid?: string | null; authToken?: string | null; phoneNumber?: string | null; apiKey?: string | null; apiUrl?: string | null },
    to: string,
    message: string,
  ): Promise<{ externalId: string }> {
    if (config.apiUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

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

      const responseBody = await response.json() as { id?: string };
      return { externalId: responseBody.id ?? "unknown" };
    }

    // Twilio via REST API (no Twilio package needed)
    if (config.provider === "twilio" && config.accountSid && config.authToken && config.phoneNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const twilioBody = new URLSearchParams({
        From: `whatsapp:${config.phoneNumber}`,
        To: `whatsapp:${to}`,
        Body: message,
      });

      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody.toString(),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Twilio returned ${String(response.status)}: ${body}`);
      }

      const result = await response.json() as { sid: string };
      return { externalId: result.sid };
    }

    throw new Error(`WhatsApp provider "${config.provider}" not configured. Set API URL or configure Twilio.`);
  }
}
