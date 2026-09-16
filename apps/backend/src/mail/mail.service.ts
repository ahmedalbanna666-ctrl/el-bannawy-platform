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
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تأكيد حسابك - منصة البناوي</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#0891b2,#06b6d4,#22d3ee);padding:36px 40px;text-align:center;">
              <img src="https://www.elbannawy.online/logo.jpeg" alt="منصة البناوي" width="72" height="72" style="border-radius:16px;border:3px solid rgba(255,255,255,0.3);display:block;margin:0 auto 16px;" />
              <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;line-height:1.4;">تأكيد حسابك في منصة البناوي</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">خطوتك الأخيرة للانضمام אלינו</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#334155;font-size:15px;line-height:1.8;margin:0 0 20px;">مرحباً بك! استخدم الكود التالي لإكمال تسجيل حسابك والبدء في رحلة التعلم:</p>

              <!-- Code box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#ecfeff,#cffafe);border:2px solid #a5f3fc;border-radius:14px;padding:20px;text-align:center;">
                    <p style="color:#0e7490;font-size:12px;font-weight:600;margin:0 0 8px;letter-spacing:1px;">كود التأكيد</p>
                    <span dir="ltr" style="display:inline-block;font-size:36px;font-weight:900;letter-spacing:12px;color:#0891b2;font-family:'Courier New',monospace;">${code}</span>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:24px 0 0;">⏰ هذا الكود صالح لمدة <strong style="color:#64748b;">15 دقيقة</strong> فقط.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">إذا لم تطلب إنشاء حساب، تجاهل هذه الرسالة.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td align="center">
                    <img src="https://www.elbannawy.online/logo.jpeg" alt="منصة البناوي" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
                    <span style="color:#64748b;font-size:13px;font-weight:600;vertical-align:middle;margin-right:6px;">منصة البناوي</span>
                    <span style="color:#cbd5e1;font-size:12px;">|</span>
                    <span style="color:#94a3b8;font-size:12px;vertical-align:middle;"> El-bannawy Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
  }
}
