import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  LiveSessionStatusEnum,
  LiveBookingStatusEnum,
  LiveSubscriptionStatusEnum,
  LiveSessionTypeEnum,
} from "@el-bannawy/shared";

const SESSION_INCLUDE = {
  teacher: { select: { id: true, fullName: true, email: true } },
  _count: { select: { bookings: true } },
} as const;

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveRole(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? "STUDENT";
  }

  // ── Sessions ────────────────────────────────────────────────
  async getSessions(): Promise<unknown[]> {
    return this.prisma.liveSession.findMany({
      where: { deletedAt: null },
      include: SESSION_INCLUDE,
      orderBy: { date: "asc" },
    });
  }

  async getSession(id: string): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  async createSession(dto: {
    title: string;
    teacherId: string;
    gradeId?: string;
    availabilitySlotId?: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    maxStudents?: number;
    type: string;
    meetingUrl?: string;
    meetingPassword?: string;
    meetingProvider?: string;
    notes?: string;
  }): Promise<unknown> {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException("Teacher not found");
    return this.prisma.liveSession.create({
      data: {
        title: dto.title,
        teacherId: dto.teacherId,
        gradeId: dto.gradeId ?? null,
        availabilitySlotId: dto.availabilitySlotId ?? null,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        durationMinutes: dto.durationMinutes ?? 60,
        maxStudents: dto.maxStudents ?? null,
        availableSeats: dto.maxStudents ?? null,
        type: dto.type as never,
        meetingUrl: dto.meetingUrl ?? null,
        meetingPassword: dto.meetingPassword ?? null,
        meetingProvider: (dto.meetingProvider ?? "EXTERNAL_URL") as never,
        notes: dto.notes ?? null,
        status: LiveSessionStatusEnum.DRAFT as never,
      },
      include: SESSION_INCLUDE,
    });
  }

  async updateSession(
    id: string,
    actorId: string,
    role: string,
    dto: Record<string, unknown>,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.date) data.date = new Date(dto.date as string);
    if (dto.startTime) data.startTime = new Date(dto.startTime as string);
    if (dto.endTime) data.endTime = new Date(dto.endTime as string);
    if (dto.status === LiveSessionStatusEnum.PUBLISHED) data.publishedAt = new Date();
    if (dto.status === LiveSessionStatusEnum.LIVE) data.liveAt = new Date();
    if (dto.status === LiveSessionStatusEnum.COMPLETED) data.completedAt = new Date();
    if (dto.status === LiveSessionStatusEnum.CANCELLED) data.cancelledAt = new Date();
    return this.prisma.liveSession.update({ where: { id }, data, include: SESSION_INCLUDE });
  }

  async deleteSession(id: string, actorId: string, role: string): Promise<{ id: string }> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    await this.prisma.liveSession.update({
      where: { id },
      data: { deletedAt: new Date(), status: LiveSessionStatusEnum.ARCHIVED as never },
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
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    return this.prisma.liveSession.update({
      where: { id },
      data: { status: status as never, ...extra },
      include: SESSION_INCLUDE,
    });
  }

  async publishSession(id: string, actorId: string, role: string): Promise<unknown> {
    return this.setStatus(id, actorId, role, LiveSessionStatusEnum.PUBLISHED, { publishedAt: new Date() });
  }

  async unpublishSession(id: string, actorId: string, role: string): Promise<unknown> {
    return this.setStatus(id, actorId, role, LiveSessionStatusEnum.DRAFT, {});
  }

  async startSession(id: string, actorId: string, role: string): Promise<unknown> {
    return this.setStatus(id, actorId, role, LiveSessionStatusEnum.LIVE, { liveAt: new Date() });
  }

  async endSession(id: string, actorId: string, role: string): Promise<unknown> {
    return this.setStatus(id, actorId, role, LiveSessionStatusEnum.COMPLETED, { completedAt: new Date() });
  }

  // ── Bookings ───────────────────────────────────────────────
  async getMyBookings(userId: string): Promise<unknown[]> {
    return this.prisma.liveBooking.findMany({
      where: { studentId: userId, cancelledAt: null },
      include: { session: { include: SESSION_INCLUDE } },
      orderBy: { createdAt: "desc" },
    });
  }

  async bookSession(
    userId: string,
    dto: { sessionId: string; subscriptionId?: string },
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: dto.sessionId, deletedAt: null },
      include: { _count: { select: { bookings: true } } },
    });
    if (!session) throw new NotFoundException("Session not found");
    const existing = await this.prisma.liveBooking.findFirst({
      where: { sessionId: dto.sessionId, studentId: userId },
    });
    if (existing && !existing.cancelledAt) {
      throw new BadRequestException("You are already booked for this session");
    }
    if (session.maxStudents && session._count.bookings >= session.maxStudents) {
      throw new BadRequestException("Session is full");
    }
    const booking = await this.prisma.liveBooking.upsert({
      where: { sessionId_studentId: { sessionId: dto.sessionId, studentId: userId } },
      create: {
        sessionId: dto.sessionId,
        studentId: userId,
        subscriptionId: dto.subscriptionId ?? null,
        status: LiveBookingStatusEnum.CONFIRMED as never,
      },
      update: {
        status: LiveBookingStatusEnum.CONFIRMED as never,
        cancelledAt: null,
        cancelReason: null,
        subscriptionId: dto.subscriptionId ?? null,
      },
      include: { session: { include: SESSION_INCLUDE } },
    });
    await this.decrementSeats(dto.sessionId);
    return booking;
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    role: string,
  ): Promise<{ id: string }> {
    const booking = await this.prisma.liveBooking.findFirst({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (role === "STUDENT" && booking.studentId !== userId) {
      throw new ForbiddenException("Not your booking");
    }
    await this.prisma.liveBooking.update({
      where: { id: bookingId },
      data: {
        status: LiveBookingStatusEnum.CANCELLED as never,
        cancelledAt: new Date(),
        cancelReason: "Cancelled by user",
      },
    });
    await this.incrementSeats(booking.sessionId);
    return { id: bookingId };
  }

  // ── Subscriptions ──────────────────────────────────────────
  async getSubscriptions(userId: string, teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { userId, deletedAt: null };
    if (teacherId) where.teacherId = teacherId;
    return this.prisma.liveSubscription.findMany({
      where: where as never,
      include: { teacher: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createSubscription(
    userId: string,
    dto: { teacherId: string; type: string },
  ): Promise<unknown> {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException("Teacher not found");
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    const isGroup = dto.type.includes("GROUP");
    const count = isGroup ? 8 : 4;
    return this.prisma.liveSubscription.create({
      data: {
        userId,
        teacherId: dto.teacherId,
        type: dto.type as never,
        status: LiveSubscriptionStatusEnum.ACTIVE as never,
        packageLabel: isGroup ? "GROUP" : "PRIVATE",
        packageSessionCount: count,
        sessionsTotal: count,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        nextBillingDate: end,
        autoRenew: true,
      },
      include: { teacher: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async updateSubscription(
    id: string,
    dto: { type?: string; status?: string; isActive?: boolean },
  ): Promise<unknown> {
    const sub = await this.prisma.liveSubscription.findFirst({
      where: { id, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    const data: Record<string, unknown> = {};
    if (dto.type) data.type = dto.type;
    if (dto.status) data.status = dto.status;
    if (dto.isActive !== undefined) {
      data.status = (dto.isActive
        ? LiveSubscriptionStatusEnum.ACTIVE
        : LiveSubscriptionStatusEnum.CANCELLED);
    }
    return this.prisma.liveSubscription.update({ where: { id }, data });
  }

  // ── Teacher Availability ───────────────────────────────────
  async getAvailabilities(teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (teacherId) where.teacherId = teacherId;
    return this.prisma.teacherAvailability.findMany({
      where: where as never,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async createAvailability(
    dto: {
      teacherId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      gradeId?: string;
      maxStudents?: number;
      type?: string;
      isRecurring?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ): Promise<unknown> {
    return this.prisma.teacherAvailability.create({
      data: {
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        gradeId: dto.gradeId ?? null,
        maxStudents: dto.maxStudents ?? 1,
        type: (dto.type ?? LiveSessionTypeEnum.PRIVATE) as never,
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
  }

  async updateAvailability(
    id: string,
    actorId: string,
    role: string,
    dto: Record<string, unknown>,
  ): Promise<unknown> {
    const avail = await this.prisma.teacherAvailability.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!avail) throw new NotFoundException("Availability not found");
    if (role === "TEACHER" && avail.teacherId !== actorId) {
      throw new ForbiddenException("Not your availability");
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime as string);
    if (dto.endTime) data.endTime = new Date(dto.endTime as string);
    if (dto.effectiveFrom) data.effectiveFrom = new Date(dto.effectiveFrom as string);
    if (dto.effectiveTo) data.effectiveTo = new Date(dto.effectiveTo as string);
    return this.prisma.teacherAvailability.update({ where: { id }, data });
  }

  async deleteAvailability(id: string, actorId: string, role: string): Promise<{ id: string }> {
    const avail = await this.prisma.teacherAvailability.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!avail) throw new NotFoundException("Availability not found");
    if (role === "TEACHER" && avail.teacherId !== actorId) {
      throw new ForbiddenException("Not your availability");
    }
    await this.prisma.teacherAvailability.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  // ── Calendar / Available Slots ─────────────────────────────
  async getAvailableSlots(dto: {
    teacherId?: string;
    gradeId?: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<unknown[]> {
    const from = new Date(dto.dateFrom);
    const to = new Date(dto.dateTo);
    const availability = await this.prisma.teacherAvailability.findMany({
      where: {
        deletedAt: null,
        ...(dto.teacherId ? { teacherId: dto.teacherId } : {}),
        ...(dto.gradeId ? { gradeId: dto.gradeId } : {}),
      },
      include: { teacher: { select: { id: true, fullName: true } } },
    });
    const dateBlocks = await this.prisma.teacherDateBlock.findMany({
      where: {
        blockedDate: { gte: from, lte: to },
        ...(dto.teacherId ? { teacherId: dto.teacherId } : {}),
      },
    });
    const slots: unknown[] = [];
    for (const avail of availability) {
      const cur = new Date(from);
      while (cur <= to) {
        if (cur.getDay() === avail.dayOfWeek) {
          const dateStr = cur.toISOString().split("T")[0];
          const blocked = dateBlocks.find(
            (b) =>
              b.teacherId === avail.teacherId &&
              b.blockedDate.toISOString().split("T")[0] === dateStr,
          );
          if (!blocked) {
            const existing = await this.prisma.liveSession.findFirst({
              where: { teacherId: avail.teacherId, date: cur, deletedAt: null },
              select: { id: true, _count: { select: { bookings: true } } },
            });
            const booked = existing?._count.bookings ?? 0;
            const availableSeats = Math.max(0, avail.maxStudents - booked);
            slots.push({
              slotId: `${avail.id}:${dateStr}`,
              teacherId: avail.teacherId,
              teacherName: (avail as { teacher: { fullName: string } }).teacher.fullName,
              date: dateStr,
              startTime: (avail.startTime).toISOString(),
              endTime: (avail.endTime).toISOString(),
              dayOfWeek: avail.dayOfWeek,
              type: avail.type,
              maxStudents: avail.maxStudents,
              gradeId: avail.gradeId,
              existingSessionId: existing?.id ?? null,
              availableSeats,
            });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return slots;
  }

  async bookBySlot(
    userId: string,
    slotId: string,
    dto: { date: string; subscriptionId?: string },
  ): Promise<unknown> {
    const [availId, dateStr] = slotId.split(":");
    const avail = await this.prisma.teacherAvailability.findFirst({
      where: { id: availId, deletedAt: null },
    });
    if (!avail) throw new NotFoundException("Slot not found");
    const session = (await this.prisma.liveSession.findFirst({
      where: { teacherId: avail.teacherId, date: new Date(dateStr), deletedAt: null },
    })) ?? (await this.prisma.liveSession.create({
      data: {
        title: `Live Session ${dateStr}`,
        teacherId: avail.teacherId,
        gradeId: avail.gradeId,
        availabilitySlotId: avail.id,
        date: new Date(dateStr),
        startTime: avail.startTime,
        endTime: avail.endTime,
        maxStudents: avail.maxStudents,
        availableSeats: avail.maxStudents,
        type: avail.type,
        status: LiveSessionStatusEnum.PUBLISHED as never,
        publishedAt: new Date(),
      },
      include: SESSION_INCLUDE,
    }));
    const booking = await this.bookSession(userId, {
      sessionId: session.id,
      subscriptionId: dto.subscriptionId,
    });
    return booking;
  }

  // ── Date Blocks ────────────────────────────────────────────
  async blockDate(
    teacherId: string,
    dto: { date: string; reason?: string },
  ): Promise<unknown> {
    return this.prisma.teacherDateBlock.create({
      data: { teacherId, blockedDate: new Date(dto.date), reason: dto.reason ?? null },
    });
  }

  async unblockDate(
    id: string,
    actorId: string,
    role: string,
  ): Promise<{ id: string }> {
    const block = await this.prisma.teacherDateBlock.findFirst({ where: { id } });
    if (!block) throw new NotFoundException("Date block not found");
    if (role === "TEACHER" && block.teacherId !== actorId) {
      throw new ForbiddenException("Not your date block");
    }
    await this.prisma.teacherDateBlock.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  async getDateBlocks(teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (teacherId) where.teacherId = teacherId;
    return this.prisma.teacherDateBlock.findMany({ where: where as never, orderBy: { blockedDate: "asc" } });
  }

  // ── Control Panel ──────────────────────────────────────────
  async getControlPanel(
    sessionId: string,
    actorId: string,
    role: string,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    const [participants, announcements, attendance, controlLogs] = await Promise.all([
      this.prisma.liveBooking.findMany({
        where: { sessionId, cancelledAt: null },
        include: {
          session: { include: SESSION_INCLUDE },
          student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.liveAnnouncement.findMany({
        where: { sessionId },
        include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveAttendance.findMany({
        where: { sessionId },
        include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      }),
      this.prisma.liveSessionControlLog.findMany({
        where: { sessionId },
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { session, participants, announcements, attendance, controlLogs };
  }

  async getAnnouncements(sessionId: string): Promise<unknown[]> {
    return this.prisma.liveAnnouncement.findMany({
      where: { sessionId },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async sendAnnouncement(
    sessionId: string,
    senderId: string,
    dto: { message: string; type?: string; pin?: boolean },
  ): Promise<unknown> {
    return this.prisma.liveAnnouncement.create({
      data: {
        sessionId,
        senderId,
        message: dto.message,
        type: dto.type ?? "INFO",
        pinned: dto.pin ?? false,
      },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  async removeParticipant(
    sessionId: string,
    studentId: string,
    actorId: string,
    role: string,
  ): Promise<{ sessionId: string; studentId: string }> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    const booking = await this.prisma.liveBooking.findFirst({
      where: { sessionId, studentId },
    });
    if (booking) {
      await this.prisma.liveBooking.update({
        where: { id: booking.id },
        data: {
          status: LiveBookingStatusEnum.CANCELLED as never,
          cancelledAt: new Date(),
          cancelReason: "Removed by teacher",
        },
      });
      await this.incrementSeats(sessionId);
    }
    return { sessionId, studentId };
  }

  async recordAttendance(dto: {
    sessionId: string;
    studentId: string;
    status: string;
    notes?: string;
    markedById?: string;
  }): Promise<unknown> {
    return this.prisma.liveAttendance.upsert({
      where: { sessionId_studentId: { sessionId: dto.sessionId, studentId: dto.studentId } },
      update: {
        status: dto.status as never,
        notes: dto.notes ?? null,
        markedById: dto.markedById ?? null,
      },
      create: {
        sessionId: dto.sessionId,
        studentId: dto.studentId,
        status: dto.status as never,
        notes: dto.notes ?? null,
        markedById: dto.markedById ?? null,
      },
    });
  }

  async overrideSettings(
    sessionId: string,
    actorId: string,
    role: string,
    settings: Record<string, unknown>,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
    const data: Record<string, unknown> = {};
    if (typeof settings.meetingUrl === "string") data.meetingUrl = settings.meetingUrl;
    if (typeof settings.meetingPassword === "string") data.meetingPassword = settings.meetingPassword;
    if (typeof settings.meetingProvider === "string") data.meetingProvider = settings.meetingProvider;
    if (typeof settings.maxStudents === "number") data.maxStudents = settings.maxStudents;
    await this.prisma.liveSessionControlLog.create({
      data: {
        sessionId,
        action: "OVERRIDE_SETTINGS",
        actorId,
        details: JSON.stringify(settings),
      },
    });
    if (Object.keys(data).length > 0) {
      return this.prisma.liveSession.update({ where: { id: sessionId }, data, include: SESSION_INCLUDE });
    }
    return session;
  }

  async getControlLogs(sessionId: string): Promise<unknown[]> {
    return this.prisma.liveSessionControlLog.findMany({
      where: { sessionId },
      include: { actor: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  private async decrementSeats(sessionId: string): Promise<void> {
    await this.prisma.liveSession.updateMany({
      where: { id: sessionId, availableSeats: { gt: 0 } },
      data: { availableSeats: { decrement: 1 } },
    });
  }

  private async incrementSeats(sessionId: string): Promise<void> {
    await this.prisma.liveSession.updateMany({
      where: { id: sessionId },
      data: { availableSeats: { increment: 1 } },
    });
  }
}
