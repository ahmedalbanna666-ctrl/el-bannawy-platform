import { Injectable, NotFoundException, ConflictException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, NotificationTargetType } from "../notifications/dto/notification.dto";
import type { CreateGradeScheduleDto } from "./dto/create-grade-schedule.dto";
import type { UpdateGradeScheduleDto } from "./dto/update-grade-schedule.dto";

const DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

@Injectable()
export class GradeScheduleService {
  private readonly logger = new Logger(GradeScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateGradeScheduleDto): Promise<unknown> {
    const grade = await this.prisma.grade.findUnique({ where: { id: dto.gradeId } });
    if (!grade) throw new NotFoundException("Grade not found");

    const existing = await this.prisma.gradeSchedule.findUnique({ where: { gradeId: dto.gradeId } });
    if (existing) throw new ConflictException("Schedule already exists for this grade");

    return this.prisma.gradeSchedule.create({
      data: {
        gradeId: dto.gradeId,
        days: dto.days,
        isActive: dto.isActive ?? true,
      },
      include: { grade: { select: { id: true, name: true, stageId: true } } },
    });
  }

  async findAll(): Promise<unknown> {
    return this.prisma.gradeSchedule.findMany({
      include: { grade: { select: { id: true, name: true, stageId: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const schedule = await this.prisma.gradeSchedule.findUnique({
      where: { id },
      include: { grade: { select: { id: true, name: true, stageId: true } } },
    });
    if (!schedule) throw new NotFoundException("Grade schedule not found");
    return schedule;
  }

  async findByGrade(gradeId: string): Promise<unknown> {
    return this.prisma.gradeSchedule.findUnique({
      where: { gradeId },
    });
  }

  async update(id: string, dto: UpdateGradeScheduleDto): Promise<unknown> {
    const schedule = await this.prisma.gradeSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException("Grade schedule not found");

    return this.prisma.gradeSchedule.update({
      where: { id },
      data: {
        ...(dto.days !== undefined && { days: dto.days }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { grade: { select: { id: true, name: true, stageId: true } } },
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const schedule = await this.prisma.gradeSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException("Grade schedule not found");

    await this.prisma.gradeSchedule.delete({ where: { id } });
    return { deleted: true };
  }

  async checkAccess(userId: string): Promise<{ allowed: boolean; message?: string; scheduledDays?: number[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gradeId: true, role: true },
    });
    if (!user) throw new NotFoundException("User not found");

    if (user.role !== "STUDENT") return { allowed: true };

    if (!user.gradeId) return { allowed: true };

    const schedule = await this.prisma.gradeSchedule.findUnique({
      where: { gradeId: user.gradeId },
    });

    if (!schedule?.isActive) return { allowed: true };

    const today = new Date().getDay();
    const allowed = schedule.days.includes(today);

    if (!allowed) {
      const dayNames = schedule.days.map((d) => DAY_NAMES[d] ?? "يوم آخر");
      const message = `حصتك غير متاحة اليوم. مواعيد حصصك: ${dayNames.join("، ")}، يرجى الدخول في هذه الأيام.`;
      return { allowed: false, message, scheduledDays: schedule.days };
    }

    return { allowed: true, scheduledDays: schedule.days };
  }

  async sendTodayNotifications(): Promise<{ gradesNotified: number; studentsNotified: number }> {
    const today = new Date().getDay();
    const schedules = await this.prisma.gradeSchedule.findMany({
      where: { isActive: true, days: { has: today } },
      include: { grade: { select: { id: true, name: true } } },
    });

    let gradesNotified = 0;
    let studentsNotified = 0;

    for (const schedule of schedules) {
      const students = await this.prisma.user.findMany({
        where: { gradeId: schedule.gradeId, role: "STUDENT", status: "ACTIVE" },
        select: { id: true },
      });

      if (students.length === 0) continue;

      const dayNames = schedule.days.map((d) => DAY_NAMES[d] ?? "يوم آخر");
      for (const student of students) {
        this.notifications
          .sendNotification(student.id, {
            type: "lesson_reminder",
            title: "الحصص متاحة الآن 🎉",
            message: `حصص ${schedule.grade.name} متاحة اليوم (${dayNames.join(" و ")}). يمكنك الدخول والمشاهدة الآن!`,
            priority: NotificationPriority.MEDIUM,
            targetType: NotificationTargetType.GRADE,
            targetId: schedule.gradeId,
          })
          .catch((err: unknown) => {
            this.logger.error(`Failed to notify student ${student.id}: ${err instanceof Error ? err.message : String(err)}`);
          });
      }

      gradesNotified++;
      studentsNotified += students.length;
    }

    return { gradesNotified, studentsNotified };
  }
}
