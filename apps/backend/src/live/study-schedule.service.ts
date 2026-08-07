import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveSessionTypeEnum } from "@el-bannawy/shared";
import type { $Enums, Prisma } from "@prisma/client";

const AVAILABILITY_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toAvailabilityDate(value: string): Date {
  const match = AVAILABILITY_TIME_RE.exec(value);
  if (match) {
    const [, hh, mm] = match;
    return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
  }
  return new Date(value);
}

function toTimeOfDay(date: Date): string {
  return date.toISOString().slice(11, 16);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SCHEDULE_INCLUDE = {
  teacher: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
  days: {
    where: { deletedAt: null },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  },
  _count: { select: { subscriptions: true } },
} satisfies Prisma.StudyScheduleInclude;

/**
 * StudyScheduleService — the teacher-facing scheduling surface.
 *
 * A StudySchedule groups one or more TeacherAvailability day-rows under a
 * single named, bookable entity. Private schedules hold one student per time
 * slot; group schedules are the bookable groups themselves (capacity =
 * maxStudents). Teachers manage schedules; students read group schedules to
 * join, and private schedule days to pick from.
 */
@Injectable()
export class StudyScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
  ) {}

  private scheduleInclude(): Prisma.StudyScheduleInclude {
    return SCHEDULE_INCLUDE;
  }

  private serialize(schedule: {
    id: string;
    name: string;
    type: $Enums.LiveSessionType;
    maxStudents: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    teacher?: { id: string; fullName: string; email: string | null; avatarUrl: string | null };
    days?: {
      id: string;
      dayOfWeek: number;
      startTime: Date;
      endTime: Date;
      maxStudents: number;
    }[];
    _count?: { subscriptions: number };
  }): Record<string, unknown> {
    return {
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      maxStudents: schedule.maxStudents,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      teacher: schedule.teacher,
      days: (schedule.days ?? []).map((day) => ({
        id: day.id,
        dayOfWeek: day.dayOfWeek,
        dayName: DAY_NAMES[day.dayOfWeek],
        startTime: toTimeOfDay(day.startTime),
        endTime: toTimeOfDay(day.endTime),
      })),
      subscribedCount: schedule._count?.subscriptions ?? 0,
    };
  }

  async createSchedule(
    actorId: string,
    role: string,
    dto: {
      name: string;
      type: LiveSessionTypeEnum;
      days: number[];
      startTime: string;
      endTime: string;
      gradeId?: string;
      maxStudents?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ): Promise<unknown> {
    if (role !== "TEACHER" && role !== "ADMINISTRATOR") {
      throw new ForbiddenException("Only teachers can create study schedules");
    }
    if (dto.days.length === 0) {
      throw new BadRequestException("At least one day is required");
    }
    const uniqueDays = [...new Set(dto.days)];
    const start = toAvailabilityDate(dto.startTime);
    const end = toAvailabilityDate(dto.endTime);
    if (end <= start) {
      throw new BadRequestException("End time must be after start time");
    }
    const maxStudents = dto.maxStudents ?? 1;
    if (dto.type === LiveSessionTypeEnum.PRIVATE && maxStudents !== 1) {
      throw new BadRequestException("Private schedules hold one student per slot");
    }

    await this.assertNoOverlap(actorId, uniqueDays, start, end, null);

    const scheduleId = await this.prisma.$transaction(async (tx) => {
      const schedule = await tx.studySchedule.create({
        data: {
          teacherId: actorId,
          name: dto.name,
          type: dto.type,
          maxStudents,
        },
      });
      await tx.teacherAvailability.createMany({
        data: uniqueDays.map((dayOfWeek) => ({
          teacherId: actorId,
          scheduleId: schedule.id,
          dayOfWeek,
          startTime: start,
          endTime: end,
          gradeId: dto.gradeId ?? null,
          maxStudents,
          type: dto.type,
          isRecurring: true,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        })),
      });
      return schedule.id;
    });
    return this.getSchedule(scheduleId, actorId, role);
  }

  async listSchedules(actorId: string, role: string, teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (role === "TEACHER") {
      where.teacherId = actorId;
    } else if (teacherId) {
      where.teacherId = teacherId;
    }
    const rows = await this.prisma.studySchedule.findMany({
      where,
      include: this.scheduleInclude(),
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => this.serialize(s));
  }

  async getSchedule(id: string, actorId: string, role: string): Promise<unknown> {
    const schedule = await this.prisma.studySchedule.findFirst({
      where: { id, deletedAt: null },
      include: this.scheduleInclude(),
    });
    if (!schedule) throw new NotFoundException("Schedule not found");
    if (role === "TEACHER" && schedule.teacherId !== actorId) {
      throw new ForbiddenException("Not your schedule");
    }
    return this.serialize(schedule);
  }

  async updateSchedule(
    id: string,
    actorId: string,
    role: string,
    dto: Record<string, unknown>,
  ): Promise<unknown> {
    const schedule = await this.prisma.studySchedule.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!schedule) throw new NotFoundException("Schedule not found");
    if (role === "TEACHER" && schedule.teacherId !== actorId) {
      throw new ForbiddenException("Not your schedule");
    }

    const name = typeof dto.name === "string" ? dto.name : undefined;
    const type =
      typeof dto.type === "string" ? (dto.type as $Enums.LiveSessionType) : undefined;
    const maxStudents =
      typeof dto.maxStudents === "number" ? dto.maxStudents : undefined;
    const isActive = typeof dto.isActive === "boolean" ? dto.isActive : undefined;
    const effectiveFrom =
      typeof dto.effectiveFrom === "string" ? new Date(dto.effectiveFrom) : undefined;
    const effectiveTo =
      typeof dto.effectiveTo === "string" ? new Date(dto.effectiveTo) : undefined;
    const days = Array.isArray(dto.days)
      ? [...new Set((dto.days as unknown[]).map(Number))]
      : undefined;
    const startTime = typeof dto.startTime === "string" ? dto.startTime : undefined;
    const endTime = typeof dto.endTime === "string" ? dto.endTime : undefined;

    if (startTime && endTime) {
      const start = toAvailabilityDate(startTime);
      const end = toAvailabilityDate(endTime);
      if (end <= start) {
        throw new BadRequestException("End time must be after start time");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.studySchedule.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(type !== undefined ? { type } : {}),
          ...(maxStudents !== undefined ? { maxStudents } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(effectiveFrom !== undefined ? { effectiveFrom } : {}),
          ...(effectiveTo !== undefined ? { effectiveTo } : {}),
        },
      });

      if (days) {
        const existing = await tx.teacherAvailability.findMany({
          where: { scheduleId: id, deletedAt: null },
          select: { id: true, dayOfWeek: true },
        });
        const existingMap = new Map(existing.map((e) => [e.dayOfWeek, e]));
        for (const day of days) {
          const row = existingMap.get(day);
          if (row) {
            await tx.teacherAvailability.update({
              where: { id: row.id },
              data: {
                ...(startTime !== undefined ? { startTime: toAvailabilityDate(startTime) } : {}),
                ...(endTime !== undefined ? { endTime: toAvailabilityDate(endTime) } : {}),
                ...(type !== undefined ? { type } : {}),
                ...(maxStudents !== undefined ? { maxStudents } : {}),
                ...(effectiveFrom !== undefined ? { effectiveFrom } : {}),
                ...(effectiveTo !== undefined ? { effectiveTo } : {}),
              },
            });
          } else {
            const base = await tx.teacherAvailability.findFirst({
              where: { scheduleId: id, deletedAt: null },
              select: { startTime: true, endTime: true, gradeId: true, maxStudents: true, type: true },
            });
            const dayStart = startTime ? toAvailabilityDate(startTime) : (base?.startTime ?? toAvailabilityDate("00:00"));
            const dayEnd = endTime ? toAvailabilityDate(endTime) : (base?.endTime ?? dayStart);
            await tx.teacherAvailability.create({
              data: {
                teacherId: schedule.teacherId,
                scheduleId: id,
                dayOfWeek: day,
                startTime: dayStart,
                endTime: dayEnd,
                gradeId: base?.gradeId ?? null,
                maxStudents: maxStudents ?? base?.maxStudents ?? 1,
                type: type ?? base?.type ?? LiveSessionTypeEnum.PRIVATE,
                isRecurring: true,
              },
            });
          }
        }
        for (const existingRow of existing) {
          if (!days.includes(existingRow.dayOfWeek)) {
            await tx.teacherAvailability.update({
              where: { id: existingRow.id },
              data: { deletedAt: new Date() },
            });
          }
        }
      }
    });

    return this.getSchedule(id, actorId, role);
  }

  async deleteSchedule(id: string, actorId: string, role: string): Promise<{ id: string }> {
    const schedule = await this.prisma.studySchedule.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!schedule) throw new NotFoundException("Schedule not found");
    if (role === "TEACHER" && schedule.teacherId !== actorId) {
      throw new ForbiddenException("Not your schedule");
    }
    await this.prisma.$transaction([
      this.prisma.studySchedule.update({ where: { id }, data: { deletedAt: new Date() } }),
      this.prisma.teacherAvailability.updateMany({
        where: { scheduleId: id },
        data: { deletedAt: new Date() },
      }),
    ]);
    return { id };
  }

  private async assertNoOverlap(
    teacherId: string,
    days: number[],
    start: Date,
    end: Date,
    excludeScheduleId: string | null,
  ): Promise<void> {
    const existing = await this.prisma.teacherAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek: { in: days },
        deletedAt: null,
        ...(excludeScheduleId ? { scheduleId: { not: excludeScheduleId } } : {}),
      },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });
    const overlapping = existing.find((a) => start < a.endTime && end > a.startTime);
    if (overlapping) {
      throw new BadRequestException(
        `Schedule overlaps an existing window on ${DAY_NAMES[overlapping.dayOfWeek]} (${toTimeOfDay(overlapping.startTime)}–${toTimeOfDay(overlapping.endTime)})`,
      );
    }
  }
}
