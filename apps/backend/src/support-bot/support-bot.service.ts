import { BadGatewayException, BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type {
  SupportBotActivity,
  SupportBotAssignment,
  SupportBotKnowledge,
  SupportBotStudentContext,
} from "./interfaces/support-bot.interface";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Safety caps so the knowledge payload stays small for n8n. */
const MAX_KNOWLEDGE_SOURCES = 20;
const MAX_CHUNKS_PER_SOURCE = 10;
/** How long to wait for n8n before giving up. */
const N8N_TIMEOUT_MS = 25000;
/** Shown whenever the assistant cannot be reached (also used by the widget). */
const ASSISTANT_DOWN_MESSAGE =
  "المساعد غير متاح حالياً. حاول مرة أخرى أو أرسل تذكرة دعم وسيرد عليك فريقنا.";

@Injectable()
export class SupportBotService {
  private readonly logger = new Logger(SupportBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Same-origin proxy to the n8n support bot. The browser can never call n8n
   * directly (CORS), so the frontend posts here with its JWT and we forward
   * server-to-server. student_id always comes from the JWT — never trusted
   * from the client.
   */
  async forwardChat(userId: string, message: string): Promise<{ reply: string; remaining?: number }> {
    const clean = message.trim().slice(0, 2000);
    if (!clean) throw new BadRequestException("نص الرسالة فارغ");

    const url = this.config.get<string>("N8N_SUPPORT_WEBHOOK_URL") ?? "";
    // Fallback for general support inquiries when n8n is not configured
    const fallback = this.getGeneralSupportFallback(clean);
    if (!url) {
      if (fallback) return { reply: fallback };
      throw new ServiceUnavailableException("المساعد غير مُهيأ بعد. أرسل تذكرة دعم وسيساعدك فريقنا.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: userId,
          message: clean,
          mode: "general_support",
          hint: "أجب على استفسارات الطالب العامة حول المنصة (تسجيل، كلمة مرور، دفع، دروس، دعم) وليس فقط المنهج. استخدم العربية المصرية الودودة.",
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`n8n support webhook answered HTTP ${String(res.status)}`);
        if (fallback) return { reply: fallback };
        throw new BadGatewayException(ASSISTANT_DOWN_MESSAGE);
      }
      const data = (await res.json()) as { reply?: unknown; remaining?: unknown };
      const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply : fallback ?? "تم استلام رسالتك.";
      return typeof data.remaining === "number"
        ? { reply, remaining: data.remaining }
        : { reply };
    } catch (err) {
      if (
        err instanceof BadGatewayException ||
        err instanceof ServiceUnavailableException ||
        err instanceof BadRequestException
      ) {
        if (fallback) return { reply: fallback };
        throw err;
      }
      this.logger.warn(`n8n support webhook unreachable: ${err instanceof Error ? err.message : "unknown error"}`);
      if (fallback) return { reply: fallback };
      throw new BadGatewayException(ASSISTANT_DOWN_MESSAGE);
    } finally {
      clearTimeout(timer);
    }
  }

  private getGeneralSupportFallback(message: string): string | null {
    const m = message.toLowerCase();
    if (/(نسيت|فقدت|كلمة المرور|باسورد|password)/u.test(m)) {
      return "لو نسيت كلمة المرور:\n1) اضغط \"نسيت كلمة المرور\" في صفحة تسجيل الدخول\n2) أدخل بريدك الإلكتروني أو رقم هاتفك\n3) سيرسل لك كود تحقق لإعادة التعيين\nلو واجهت مشكلة، أرسل شكوى من صفحة الدعم وسيرد عليك فريقنا فوراً.";
    }
    if (/(دفع|فلوس|اشتراك|pay|payment|فوري|فودافون|انستا)/u.test(m)) {
      return "للدفع والاشتراك:\n• يمكنك الدفع عبر فوري، فودافون كاش، أورانج، اتصالات، أو انستاباي\n• بعد الدفع، سيتم تفعيل اشتراكك تلقائياً\n• لو واجهت مشكلة في الدفع، أرسل شكوى مع صورة الإيصال وسنساعدك فوراً.";
    }
    if (/(اتواصل|دعم|رقم|واتساب|تواصل|support)/u.test(m)) {
      return "للتواصل مع الدعم:\n• أرسل شكوى من صفحة الدعم → \"إرسال شكوى\" وسيرد عليك فريقنا\n• أو تواصل عبر واتساب الدعم المذكور في صفحة الدعم\n• نرد عادة خلال ساعات العمل.";
    }
    if (/(سجل|تسجيل|درس جديد|اشترك|register)/u.test(m)) {
      return "للتسجيل في درس جديد:\n1) ادخل لوحة التحكم → الدروس\n2) اختر الوحدة والدرس\n3) اضغط \"ابدأ الدرس\" أو \"استكمل\"\nلو الدرس مقفل، تأكد من إكمال الدروس السابقة.";
    }
    if (/(من انت|من أنت|انت مين)/u.test(m)) {
      return "أنا المساعد الذكي لمنصة البناوي 🤖 أساعدك في أي استفسار عن المنصة — تسجيل، دروس، واجبات، دفع، أو مشاكل تقنية. اسألني أي شيء!";
    }
    return null;
  }

  async getStudentContext(studentId: string): Promise<SupportBotStudentContext | null> {
    if (!UUID_RE.test(studentId)) return null;
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user || user.deletedAt) return null;

    const [logins, lastLogin] = await Promise.all([
      this.prisma.loginHistory.count({ where: { userId: studentId, success: true } }),
      this.prisma.loginHistory.findFirst({
        where: { userId: studentId, success: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const assignments = await this.getAssignments(studentId, user.gradeId);
    const activity = await this.getActivity(studentId, user.gradeId);

    return {
      student_id: user.id,
      name: user.fullName,
      email: user.email,
      logins,
      last_login: lastLogin ? lastLogin.createdAt.toISOString().slice(0, 10) : null,
      assignments,
      activity,
    };
  }

  private async scopedLessonIds(gradeId: string | null, userId: string): Promise<string[]> {
    if (gradeId) {
      const lessons = await this.prisma.lesson.findMany({
        where: { unit: { gradeId }, published: true, isHidden: false },
        select: { id: true },
      });
      return lessons.map((l) => l.id);
    }
    // No grade assigned — scope to lessons the student actually touched.
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true },
    });
    return [...new Set(rows.map((r) => r.lessonId))];
  }

  private async getAssignments(studentId: string, gradeId: string | null): Promise<SupportBotAssignment[]> {
    const lessonIds = await this.scopedLessonIds(gradeId, studentId);
    if (lessonIds.length === 0) return [];
    const homeworks = await this.prisma.homework.findMany({
      where: { lessonId: { in: lessonIds }, published: true, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    });
    if (homeworks.length === 0) return [];
    const attempts = await this.prisma.studentHomeworkAttempt.findMany({
      where: { userId: studentId, homeworkId: { in: homeworks.map((h) => h.id) } },
      orderBy: { startedAt: "desc" },
      select: { homeworkId: true, submitted: true },
    });
    const latestByHomework = new Map<string, boolean>();
    for (const a of attempts) {
      if (!latestByHomework.has(a.homeworkId)) latestByHomework.set(a.homeworkId, a.submitted);
    }
    return homeworks.map((h) => {
      const submitted = latestByHomework.get(h.id);
      return {
        id: h.id,
        title: h.title,
        status: submitted === undefined ? "لم يسلم" : submitted ? "مسلّم" : "قيد التنفيذ",
        due: null,
      };
    });
  }

  private async getActivity(studentId: string, gradeId: string | null): Promise<SupportBotActivity> {
    const lessonIds = await this.scopedLessonIds(gradeId, studentId);
    const totalLessons = lessonIds.length;
    const completedLessons =
      totalLessons === 0
        ? 0
        : await this.prisma.lessonProgress.count({
            where: { userId: studentId, lessonId: { in: lessonIds }, completed: true },
          });
    const progress = totalLessons === 0 ? "0%" : `${String(Math.round((completedLessons / totalLessons) * 100))}%`;
    return { completed_lessons: completedLessons, total_lessons: totalLessons, progress };
  }

  async getKnowledge(): Promise<SupportBotKnowledge> {
    const sources = await this.prisma.aiKnowledgeSource.findMany({
      where: { isEnabled: true, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: MAX_KNOWLEDGE_SOURCES,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        tags: true,
        chunks: {
          orderBy: { chunkIndex: "asc" },
          take: MAX_CHUNKS_PER_SOURCE,
          select: { content: true },
        },
      },
    });
    return {
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        type: s.type,
        tags: s.tags,
        chunks: s.chunks.map((c) => ({ content: c.content })),
      })),
    };
  }
}
