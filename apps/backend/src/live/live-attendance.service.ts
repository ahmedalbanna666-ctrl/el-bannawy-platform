import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import {
  MEETING_PROVIDER,
  type MeetingProvider,
} from "./meeting-provider/meeting-provider.interface";
import { ConfigurationService } from "../config/configuration.service";
import { LiveAttendanceStatusEnum } from "@el-bannawy/shared";
import { LIVE_POLICY_ENGINE, type LivePolicyEngine } from "./policy";
import {
  LIVE_DOMAIN_EVENT_BUS,
  type LiveDomainEventBus,
  LIVE_ATTENDANCE_EVENTS,
} from "./events";
import type { $Enums } from "@prisma/client";

@Injectable()
export class LiveAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
    private readonly subscriptions: LiveSubscriptionService,
    @Inject(MEETING_PROVIDER) private readonly meetingProvider: MeetingProvider,
    private readonly config: ConfigurationService,
    @Inject(LIVE_POLICY_ENGINE) private readonly policy: LivePolicyEngine,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async recordAttendance(dto: {
    sessionId: string;
    studentId: string;
    status: string;
    notes?: string;
    markedById?: string;
    role: string;
  }): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: dto.sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, dto.markedById ?? "", dto.role);
    const attendance = await this.prisma.liveAttendance.upsert({
      where: { sessionId_studentId: { sessionId: dto.sessionId, studentId: dto.studentId } },
      update: {
        status: dto.status as $Enums.LiveAttendanceStatus,
        notes: dto.notes ?? null,
        markedById: dto.markedById ?? null,
      },
      create: {
        sessionId: dto.sessionId,
        studentId: dto.studentId,
        status: dto.status as $Enums.LiveAttendanceStatus,
        notes: dto.notes ?? null,
        markedById: dto.markedById ?? null,
      },
    });

    await this.events.publish({
      type: LIVE_ATTENDANCE_EVENTS.RECORDED,
      aggregateId: attendance.id,
      occurredAt: new Date(),
      payload: {
        attendanceId: attendance.id,
        sessionId: dto.sessionId,
        studentId: dto.studentId,
        status: attendance.status,
        markedBy: dto.markedById ?? "MANUAL",
      },
    });
    return attendance;
  }

  async getSessionAttendance(sessionId: string, actorId: string, role: string): Promise<unknown[]> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    return this.prisma.liveAttendance.findMany({
      where: { sessionId },
      include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  private async assertJoinAccess(
    session: { id: string; teacherId: string; gradeId: string | null; startTime: Date; endTime: Date; status: string },
    userId: string,
    user: { id: string; gradeId: string | null; role: string },
  ): Promise<boolean> {
    const now = new Date();

    if (
      session.status === "CANCELLED" ||
      session.status === "COMPLETED" ||
      session.status === "ARCHIVED" ||
      session.status === "DRAFT"
    ) {
      throw new BadRequestException("الاجتماع غير متاح");
    }

    if (now < session.startTime) {
      throw new BadRequestException("الاجتماع لم يبدأ بعد");
    }
    if (now > session.endTime) {
      throw new BadRequestException("انتهى الاجتماع");
    }

    // Teacher hosts join their own session.
    if (session.teacherId === userId) return true;

    if (user.role !== "STUDENT") {
      throw new ForbiddenException("غير مسموح بالانضمام لهذا الاجتماع");
    }

    const [booking, hasActiveSubscription] = await Promise.all([
      this.prisma.liveBooking.findFirst({
        where: { sessionId: session.id, studentId: userId, cancelledAt: null },
      }),
      this.subscriptions.hasAnyActiveSubscription(userId, session.teacherId),
    ]);
    const hasBooking = Boolean(booking);

    if (!hasBooking && !hasActiveSubscription) {
      throw new ForbiddenException("ليس لديك اشتراك نشط لهذه الحصة");
    }

    // Student must be registered in the subject/grade when no booking exists.
    if (!hasBooking && session.gradeId) {
      if (!user.gradeId || user.gradeId !== session.gradeId) {
        throw new ForbiddenException("غير مسجل في هذه المادة");
      }
    }
    return true;
  }

  async requestJoin(
    sessionId: string,
    userId: string,
    device: string | null,
    ip: string | null,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
    });
    if (!session) throw new NotFoundException("الاجتماع غير موجود");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, gradeId: true, role: true },
    });
    if (!user) throw new ForbiddenException("المستخدم غير مصرح له");

    const isHost = session.teacherId === userId;
    await this.assertJoinAccess(session, userId, user);

    const now = new Date();

    // Record attendance (join).
    const existingAttendance = await this.prisma.liveAttendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
    });
    const attendance = await this.prisma.liveAttendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
      update:
        existingAttendance && !existingAttendance.leftAt
          ? { device: device ?? null, ip: ip ?? null }
          : {
              status: LiveAttendanceStatusEnum.JOINED,
              joinedAt: now,
              leftAt: null,
              durationMinutes: null,
              markedBy: "AUTO",
              device: device ?? null,
              ip: ip ?? null,
            },
      create: {
        sessionId,
        studentId: userId,
        status: LiveAttendanceStatusEnum.JOINED,
        joinedAt: now,
        markedBy: "AUTO",
        device: device ?? null,
        ip: ip ?? null,
      },
    });

    await this.events.publish({
      type: LIVE_ATTENDANCE_EVENTS.RECORDED,
      aggregateId: attendance.id,
      occurredAt: now,
      payload: {
        attendanceId: attendance.id,
        sessionId,
        studentId: userId,
        status: attendance.status,
        markedBy: "AUTO",
      },
    });

    // Build join configuration.
    if (session.meetingProvider === "ZOOM_SDK" && session.zoomMeetingId) {
      const role: 0 | 1 = isHost ? 1 : 0;
      const { signature, sdkKey } = await this.meetingProvider.generateJoinConfig({
        meetingNumber: session.zoomMeetingId,
        role,
      });
      const frontendUrl = this.getFrontendUrl();
      const leaveUrl = isHost
        ? `${frontendUrl}/dashboard/live/sessions/${sessionId}`
        : session.lessonId
          ? `${frontendUrl}/dashboard/lessons/detail/${session.lessonId}`
          : `${frontendUrl}/dashboard/live`;
      return {
        sessionId,
        sessionTitle: session.title,
        meetingNumber: session.zoomMeetingId,
        password: session.zoomPassword,
        sdkKey,
        signature,
        userName: user.fullName,
        userEmail: user.email ?? `${user.id}@el-bannawy.local`,
        role,
        provider: session.meetingProvider,
        zoomJoinUrl: session.zoomJoinUrl,
        leaveUrl,
        startedAt: now.toISOString(),
        attendance,
      };
    }

    if (session.meetingUrl) {
      return {
        sessionId,
        sessionTitle: session.title,
        provider: session.meetingProvider,
        meetingUrl: session.meetingUrl,
        password: session.meetingPassword,
        zoomJoinUrl: session.meetingUrl,
        startedAt: now.toISOString(),
        attendance,
      };
    }

    throw new BadRequestException("لا يوجد رابط اجتماع مرتبط بهذه الحصة");
  }

  async requestLeave(sessionId: string, userId: string): Promise<unknown> {
    const attendance = await this.prisma.liveAttendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
    });
    if (!attendance?.joinedAt) {
      throw new NotFoundException("لا يوجد سجل حضور لهذا الطالب");
    }
    const now = new Date();
    const durationMs = now.getTime() - attendance.joinedAt.getTime();
    const durationMinutes = Math.max(0, Math.round(durationMs / 60000));
    const policy = this.policy.getAttendancePolicy();
    const status =
      durationMinutes >= policy.minCompletedMinutes
        ? LiveAttendanceStatusEnum.COMPLETED
        : LiveAttendanceStatusEnum.LEFT_EARLY;

    const updated = await this.prisma.liveAttendance.update({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
      data: { leftAt: now, durationMinutes, status, markedBy: "AUTO" },
    });

    await this.events.publish({
      type: LIVE_ATTENDANCE_EVENTS.FINALIZED,
      aggregateId: attendance.id,
      occurredAt: now,
      payload: {
        attendanceId: attendance.id,
        sessionId,
        studentId: userId,
        status,
        durationMinutes,
      },
    });
    return updated;
  }

  private getFrontendUrl(): string {
    return this.config.app.frontendUrl;
  }
}
