import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, NotificationTargetType } from "../notifications/dto/notification.dto";
import { LiveAccessService } from "./live-access.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { RefundPolicyService } from "./booking/refund-policy.service";
import { SESSION_INCLUDE } from "./live.constants";
import { LIVE_DOMAIN_EVENT_BUS, LIVE_SESSION_EVENTS, type LiveDomainEventBus } from "./events";
import { LiveSessionStatusEnum } from "@el-bannawy/shared";
import type { Prisma } from "@prisma/client";

/** Lead time before session start at which a reminder notification is sent. */
const SESSION_REMINDER_LEAD_MINUTES = 30;

/** Valid session state transitions. Self-transitions (no-ops) are always allowed. */
const SESSION_TRANSITIONS: Record<LiveSessionStatusEnum, readonly LiveSessionStatusEnum[] | undefined> = {
  DRAFT: [LiveSessionStatusEnum.PUBLISHED, LiveSessionStatusEnum.CANCELLED, LiveSessionStatusEnum.ARCHIVED],
  PUBLISHED: [
    LiveSessionStatusEnum.DRAFT,
    LiveSessionStatusEnum.SCHEDULED,
    LiveSessionStatusEnum.OPEN,
    LiveSessionStatusEnum.FULL,
    LiveSessionStatusEnum.LIVE,
    LiveSessionStatusEnum.CANCELLED,
    LiveSessionStatusEnum.ARCHIVED,
  ],
  SCHEDULED: [
    LiveSessionStatusEnum.DRAFT,
    LiveSessionStatusEnum.PUBLISHED,
    LiveSessionStatusEnum.OPEN,
    LiveSessionStatusEnum.FULL,
    LiveSessionStatusEnum.LIVE,
    LiveSessionStatusEnum.CANCELLED,
    LiveSessionStatusEnum.ARCHIVED,
  ],
  OPEN: [
    LiveSessionStatusEnum.DRAFT,
    LiveSessionStatusEnum.PUBLISHED,
    LiveSessionStatusEnum.SCHEDULED,
    LiveSessionStatusEnum.FULL,
    LiveSessionStatusEnum.LIVE,
    LiveSessionStatusEnum.CANCELLED,
    LiveSessionStatusEnum.ARCHIVED,
  ],
  FULL: [
    LiveSessionStatusEnum.DRAFT,
    LiveSessionStatusEnum.PUBLISHED,
    LiveSessionStatusEnum.OPEN,
    LiveSessionStatusEnum.LIVE,
    LiveSessionStatusEnum.CANCELLED,
    LiveSessionStatusEnum.ARCHIVED,
  ],
  LIVE: [LiveSessionStatusEnum.COMPLETED, LiveSessionStatusEnum.CANCELLED, LiveSessionStatusEnum.ARCHIVED],
  COMPLETED: [LiveSessionStatusEnum.ARCHIVED],
  CANCELLED: [LiveSessionStatusEnum.ARCHIVED],
  ARCHIVED: [],
};

/** Snapshot shape needed to emit session lifecycle events. */
interface SessionLifecycleSnapshot {
  id: string;
  title: string;
  teacherId: string;
}

@Injectable()
export class LiveSessionService {
  private readonly logger = new Logger(LiveSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly access: LiveAccessService,
    private readonly subscriptions: LiveSubscriptionService,
    private readonly refundPolicy: RefundPolicyService,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async getSessions(page = 1, limit = 20, viewerId = "", role = "STUDENT"): Promise<unknown> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where: { deletedAt: null },
        include: SESSION_INCLUDE,
        orderBy: { date: "asc" },
        skip,
        take,
      }),
      this.prisma.liveSession.count({ where: { deletedAt: null } }),
    ]);
    const safeData = data.map((session) => this.redactMeetingCredentials(session, viewerId, role));
    return { data: safeData, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async getSession(id: string, viewerId = "", role = "STUDENT"): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException("Session not found");
    return this.redactMeetingCredentials(session, viewerId, role);
  }

  /** Meeting credentials are only exposed to the session owner or an administrator. */
  private redactMeetingCredentials(
    session: { teacherId: string },
    viewerId: string,
    role: string,
  ): Record<string, unknown> {
    if (role === "ADMINISTRATOR" || session.teacherId === viewerId) return session;
    return { ...session, meetingPassword: null, zoomPassword: null };
  }

  async updateSession(
    id: string,
    actorId: string,
    role: string,
    dto: Record<string, unknown>,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true, status: true, startTime: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);

    const nextStatus = dto.status as LiveSessionStatusEnum | undefined;
    if (nextStatus) {
      this.assertValidTransition(session.status, nextStatus);
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.date) data.date = new Date(dto.date as string);
    if (dto.startTime) data.startTime = new Date(dto.startTime as string);
    if (dto.endTime) data.endTime = new Date(dto.endTime as string);
    if (nextStatus === LiveSessionStatusEnum.PUBLISHED) data.publishedAt = new Date();
    if (nextStatus === LiveSessionStatusEnum.LIVE) data.liveAt = new Date();
    if (nextStatus === LiveSessionStatusEnum.COMPLETED) data.completedAt = new Date();
    if (nextStatus === LiveSessionStatusEnum.CANCELLED) data.cancelledAt = new Date();

    const isNewCancellation =
      nextStatus === LiveSessionStatusEnum.CANCELLED &&
      session.status !== "CANCELLED";

    if (isNewCancellation) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.liveSession.update({
          where: { id },
          data,
          include: SESSION_INCLUDE,
        });
        await this.refundBookingsForCancellation(tx, id, session.startTime);
        return result;
      });

      await this.events.publish({
        type: LIVE_SESSION_EVENTS.CANCELLED,
        aggregateId: id,
        occurredAt: new Date(),
        payload: {
          sessionId: id,
          sessionTitle: updated.title,
          teacherId: updated.teacherId,
        },
      });

      return updated;
    }

    return this.prisma.liveSession.update({
      where: { id },
      data,
      include: SESSION_INCLUDE,
    });
  }

  /** Credit back consumed subscription entitlements when the refund policy allows it. */
  private async refundBookingsForCancellation(
    tx: Prisma.TransactionClient,
    sessionId: string,
    sessionStartTime: Date,
  ): Promise<void> {
    if (!this.refundPolicy.isRefundEligible(sessionStartTime, new Date())) return;
    const bookings = await tx.liveBooking.findMany({
      where: { sessionId, cancelledAt: null, subscriptionId: { not: null } },
      select: { id: true, subscriptionId: true },
    });
    for (const booking of bookings) {
      if (booking.subscriptionId) {
        await this.subscriptions.creditBack(tx, booking.subscriptionId, { sessionId });
      }
    }
  }

  private assertValidTransition(currentStatus: string, nextStatus: string): void {
    if (currentStatus === nextStatus) return;
    const allowed = SESSION_TRANSITIONS[currentStatus as LiveSessionStatusEnum];
    if (!allowed?.includes(nextStatus as LiveSessionStatusEnum)) {
      throw new BadRequestException(
        `Invalid session status transition from "${currentStatus}" to "${nextStatus}"`,
      );
    }
  }

  async deleteSession(id: string, actorId: string, role: string): Promise<{ id: string }> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true, status: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    this.assertValidTransition(session.status, LiveSessionStatusEnum.ARCHIVED);
    await this.prisma.liveSession.update({
      where: { id },
      data: { deletedAt: new Date(), status: LiveSessionStatusEnum.ARCHIVED },
    });
    return { id };
  }

  async setStatus(
    id: string,
    actorId: string,
    role: string,
    status: LiveSessionStatusEnum,
    extra: Record<string, unknown> = {},
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true, status: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    this.assertValidTransition(session.status, status);
    return this.prisma.liveSession.update({
      where: { id },
      data: { status, ...extra },
      include: SESSION_INCLUDE,
    });
  }

  async publishSession(id: string, actorId: string, role: string): Promise<unknown> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      select: { id: true, title: true, teacherId: true, date: true, startTime: true },
    });
    if (!session) throw new NotFoundException("Session not found");

    const result = await this.setStatus(id, actorId, role, LiveSessionStatusEnum.PUBLISHED, { publishedAt: new Date() });

    const subscribers = await this.subscriptions.getActiveSubscriberUserIds(session.teacherId);
    for (const userId of subscribers) {
      this.notifications
        .sendNotification(actorId, {
          type: "live_session_reminder",
          title: "حصّة مباشرة جديدة",
          message: `تم نشر حصة مباشرة: ${session.title} في تاريخ ${session.date instanceof Date ? session.date.toLocaleDateString("ar-EG") : String(session.date)}`,
          priority: NotificationPriority.MEDIUM,
          targetType: NotificationTargetType.INDIVIDUAL,
          targetId: userId,
        })
        .catch((err: unknown) => {
          this.logger.error(`Live notification failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    await this.scheduleSessionReminder(actorId, session.id, session.title, session.teacherId, session.startTime);

    return result;
  }

  private async scheduleSessionReminder(
    actorId: string,
    sessionId: string,
    sessionTitle: string,
    teacherId: string,
    startTime: Date,
  ): Promise<void> {
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const reminderAt = new Date(start.getTime() - SESSION_REMINDER_LEAD_MINUTES * 60_000);
    if (reminderAt.getTime() <= Date.now()) return;

    const subscribers = await this.subscriptions.getActiveSubscriberUserIds(teacherId);
    if (subscribers.length === 0) return;

    try {
      await this.notifications.scheduleToUserIds(
        actorId,
        {
          type: "live_session_reminder",
          title: "تذكير بحصة مباشرة",
          message: `تذكير بوجود حصة مباشرة "${sessionTitle}" اليوم الساعة ${start.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
          priority: NotificationPriority.MEDIUM,
        },
        subscribers,
        reminderAt,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule reminder for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        "LiveSessionService",
      );
    }
  }

  async unpublishSession(id: string, actorId: string, role: string): Promise<unknown> {
    return this.setStatus(id, actorId, role, LiveSessionStatusEnum.DRAFT, {});
  }

  async startSession(id: string, actorId: string, role: string): Promise<unknown> {
    const updated = (await this.setStatus(id, actorId, role, LiveSessionStatusEnum.LIVE, {
      liveAt: new Date(),
    })) as SessionLifecycleSnapshot;
    await this.events.publish({
      type: LIVE_SESSION_EVENTS.STARTED,
      aggregateId: id,
      occurredAt: new Date(),
      payload: {
        sessionId: id,
        sessionTitle: updated.title,
        teacherId: updated.teacherId,
      },
    });
    return updated;
  }

  async endSession(id: string, actorId: string, role: string): Promise<unknown> {
    const updated = (await this.setStatus(id, actorId, role, LiveSessionStatusEnum.COMPLETED, {
      completedAt: new Date(),
    })) as SessionLifecycleSnapshot;
    await this.events.publish({
      type: LIVE_SESSION_EVENTS.ENDED,
      aggregateId: id,
      occurredAt: new Date(),
      payload: {
        sessionId: id,
        sessionTitle: updated.title,
        teacherId: updated.teacherId,
      },
    });
    return updated;
  }

  async getLessonSessions(lessonId: string, userId: string): Promise<unknown[]> {
    const sessions = await this.prisma.liveSession.findMany({
      where: { lessonId, deletedAt: null },
      include: SESSION_INCLUDE,
      orderBy: { startTime: "desc" },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gradeId: true, role: true },
    });
    const now = new Date();
    const booking = await this.prisma.liveBooking.findFirst({
      where: { sessionId: { in: sessions.map((s) => s.id) }, studentId: userId, cancelledAt: null },
    });
    const bookedIds = new Set(booking ? [booking.sessionId] : []);
    const attendance = await this.prisma.liveAttendance.findMany({
      where: { sessionId: { in: sessions.map((s) => s.id) }, studentId: userId },
    });
    const teacherIds = [...new Set(sessions.map((s) => s.teacherId))];
    const activeByTeacher = new Map(
      await Promise.all(
        teacherIds.map(
          async (teacherId) =>
            [teacherId, await this.subscriptions.hasAnyActiveSubscription(userId, teacherId)] as const,
        ),
      ),
    );

    return sessions.map((session) => {
      const isBooked = bookedIds.has(session.id);
      const isTerminal =
        session.status === "CANCELLED" ||
        session.status === "COMPLETED" ||
        session.status === "ARCHIVED" ||
        session.status === "DRAFT";
      const started = now >= session.startTime;
      const ended = now > session.endTime;
      const hasMeeting = Boolean(session.zoomMeetingId ?? session.meetingUrl);
      const hasActiveSubscription = activeByTeacher.get(session.teacherId) ?? false;
      const canJoin =
        !isTerminal &&
        !ended &&
        started &&
        hasMeeting &&
        (isBooked || hasActiveSubscription || user?.role === "TEACHER" || user?.role === "ADMINISTRATOR");
      return {
        session: this.redactMeetingCredentials(session, userId, user?.role ?? "STUDENT"),
        isBooked,
        hasActiveSubscription,
        canJoin,
        myAttendance: attendance.find((a) => a.sessionId === session.id) ?? null,
      };
    });
  }
}
