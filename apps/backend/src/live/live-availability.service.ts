import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveSessionStatusEnum, LiveSessionTypeEnum } from "@el-bannawy/shared";
import type { $Enums } from "@prisma/client";

const TERMINAL_SESSION_STATUSES = ["CANCELLED", "COMPLETED", "ARCHIVED"];

const AVAILABILITY_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse an availability time input ("HH:mm" or a full ISO string) into a Date. "HH:mm" is stored on a fixed UTC base date. */
function toAvailabilityDate(value: string): Date {
  const match = AVAILABILITY_TIME_RE.exec(value);
  if (match) {
    const [, hh, mm] = match;
    return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
  }
  return new Date(value);
}

/** Render a stored availability Date as the canonical UTC time-of-day "HH:mm". */
function toTimeOfDay(date: Date): string {
  return date.toISOString().slice(11, 16);
}

/**
 * LiveAvailabilityService — the scheduling engine for live sessions.
 *
 * Owns teacher availability windows, date blocks and the materialization of
 * concrete bookable slots from recurring availability. Availability creation
 * and update reject overlapping windows for the same teacher on the same day.
 * Slot seat counts always come from the authoritative `LiveSession`
 * (ReservationService is the single writer of `availableSeats`).
 */
@Injectable()
export class LiveAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
  ) {}

  async getAvailabilities(teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (teacherId) where.teacherId = teacherId;
    const rows = await this.prisma.teacherAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return rows.map((a) => ({
      ...a,
      startTime: toTimeOfDay(a.startTime),
      endTime: toTimeOfDay(a.endTime),
    }));
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
    const start = toAvailabilityDate(dto.startTime);
    const end = toAvailabilityDate(dto.endTime);
    if (end <= start) {
      throw new BadRequestException("Availability end time must be after start time");
    }
    await this.assertNoOverlap(dto.teacherId, dto.dayOfWeek, start, end, null);
    return this.prisma.teacherAvailability.create({
      data: {
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: start,
        endTime: end,
        gradeId: dto.gradeId ?? null,
        maxStudents: dto.maxStudents ?? 1,
        type: (dto.type ?? LiveSessionTypeEnum.PRIVATE) as $Enums.LiveSessionType,
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
      select: { id: true, teacherId: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    if (!avail) throw new NotFoundException("Availability not found");
    if (role === "TEACHER" && avail.teacherId !== actorId) {
      throw new ForbiddenException("Not your availability");
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.startTime) data.startTime = toAvailabilityDate(dto.startTime as string);
    if (dto.endTime) data.endTime = toAvailabilityDate(dto.endTime as string);
    if (dto.effectiveFrom) data.effectiveFrom = new Date(dto.effectiveFrom as string);
    if (dto.effectiveTo) data.effectiveTo = new Date(dto.effectiveTo as string);

    if (dto.startTime || dto.endTime || dto.dayOfWeek !== undefined) {
      const dayOfWeek =
        dto.dayOfWeek !== undefined ? Number(dto.dayOfWeek) : avail.dayOfWeek;
      const start =
        dto.startTime !== undefined ? toAvailabilityDate(dto.startTime as string) : avail.startTime;
      const end =
        dto.endTime !== undefined ? toAvailabilityDate(dto.endTime as string) : avail.endTime;
      if (end <= start) {
        throw new BadRequestException("Availability end time must be after start time");
      }
      await this.assertNoOverlap(avail.teacherId, dayOfWeek, start, end, id);
    }
    return this.prisma.teacherAvailability.update({ where: { id }, data });
  }

  /** Reject overlapping recurring availability for the same teacher/day. */
  private async assertNoOverlap(
    teacherId: string,
    dayOfWeek: number,
    start: Date,
    end: Date,
    excludeId: string | null,
  ): Promise<void> {
    const existing = await this.prisma.teacherAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, startTime: true, endTime: true },
    });
    const overlapping = existing.find((a) => start < a.endTime && end > a.startTime);
    if (overlapping) {
      throw new BadRequestException(
        `Availability overlaps an existing window (${overlapping.startTime.toISOString()}–${overlapping.endTime.toISOString()})`,
      );
    }
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
    const teacherIds = [...new Set(availability.map((a) => a.teacherId))];
    const existingSessions = await this.prisma.liveSession.findMany({
      where: {
        teacherId: { in: teacherIds },
        date: { gte: from, lte: to },
        deletedAt: null,
      },
      select: {
        id: true,
        teacherId: true,
        date: true,
        status: true,
        availableSeats: true,
      },
    });
    const sessionMap = new Map<string, { id: string; availableSeats: number | null }>();
    for (const session of existingSessions) {
      if (TERMINAL_SESSION_STATUSES.includes(session.status)) continue;
      const key = `${session.teacherId}:${session.date.toISOString().split("T")[0]}`;
      sessionMap.set(key, { id: session.id, availableSeats: session.availableSeats });
    }

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
            const existing = sessionMap.get(`${avail.teacherId}:${dateStr}`);
            const availableSeats = existing?.availableSeats ?? avail.maxStudents;
            slots.push({
              slotId: `${avail.id}:${dateStr}`,
              teacherId: avail.teacherId,
              teacherName: (avail as { teacher: { fullName: string } }).teacher.fullName,
              date: dateStr,
              startTime: toTimeOfDay(avail.startTime),
              endTime: toTimeOfDay(avail.endTime),
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

  /**
   * Materialize a concrete LiveSession for an availability slot on a given
   * date (find-or-create). Single source for slot -> session materialization;
   * booking flows (bookBySlot, recurring booking) reuse this instead of
   * duplicating scheduling logic.
   */
  async materializeSessionFromSlot(
    availId: string,
    dateStr: string,
  ): Promise<{ id: string; teacherId: string; type: string }> {
    const avail = await this.prisma.teacherAvailability.findFirst({
      where: { id: availId, deletedAt: null },
    });
    if (!avail) throw new NotFoundException("Slot not found");

    const existing = await this.prisma.liveSession.findFirst({
      where: { teacherId: avail.teacherId, date: new Date(dateStr), deletedAt: null },
      select: { id: true, teacherId: true, type: true },
    });
    if (existing) return existing;

    return this.prisma.liveSession.create({
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
        status: LiveSessionStatusEnum.PUBLISHED,
        publishedAt: new Date(),
      },
      select: { id: true, teacherId: true, type: true },
    });
  }

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
    return this.prisma.teacherDateBlock.findMany({ where, orderBy: { blockedDate: "asc" } });
  }
}
