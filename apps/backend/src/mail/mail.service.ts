import { Injectable, Logger } from "@nestjs/common";
import { ConfigurationService } from "../config/configuration.service";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigurationService) {}

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { brevoApiKey, brevoSenderEmail, brevoSenderName } = this.config.email;

    if (!brevoApiKey || !brevoSenderEmail) {
      this.logger.warn(
        `Brevo not configured. Email to ${params.to} suppressed (subject: "${params.subject}").`,
      );
      return { success: false, error: "Email provider not configured" };
    }

    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: brevoSenderEmail, name: brevoSenderName },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.html,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        this.logger.error(`Brevo send failed (${String(response.status)}): ${body}`);
        return { success: false, error: `Brevo send failed (${String(response.status)})` };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown Brevo error";
      this.logger.error(`Brevo send error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<SendEmailResult> {
    return this.sendEmail({
      to,
      subject: "كود تأكيد حسابك - منصة البناوي",
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display:inline-block; width: 52px; height: 52px; border-radius: 14px; background: #06b6d4; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 52px;">EB</div>
          </div>
          <h2 style="text-align: center; color: #0f172a; margin: 0 0 12px;">تأكيد حسابك في منصة البناوي</h2>
          <p style="text-align: center; color: #475569; font-size: 15px; line-height: 1.7;">استخدم الكود التالي لإكمال تسجيل حسابك. الكود صالح لمدة 15 دقيقة.</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 12px; padding: 12px 24px;" dir="ltr">${code}</span>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 13px;">إذا لم تطلب إنشاء حساب، تجاهل هذه الرسالة.</p>
          <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #cbd5e1; font-size: 12px;">منصة البناوي - El-bannawy Platform</div>
        </div>
      `,
    });
  }
}
