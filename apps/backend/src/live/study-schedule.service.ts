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
import {
  circularWindowsOverlap,
  isValidWindow,
  toAvailabilityDate,
  toTimeOfDay,
} from "./live-time.util";

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
      days: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        maxStudents?: number;
      }[];
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
    const slots = dto.days.map((day) => {
      const start = toAvailabilityDate(day.startTime);
      const end = toAvailabilityDate(day.endTime);
      if (!isValidWindow(start, end)) {
        throw new BadRequestException(
          `End time must be after start time on day ${DAY_NAMES[day.dayOfWeek]}`,
        );
      }
      return {
        dayOfWeek: day.dayOfWeek,
        startTime: start,
        endTime: end,
        maxStudents: day.maxStudents ?? dto.maxStudents ?? 1,
      };
    });
    const defaultMaxStudents = dto.maxStudents ?? 1;
    if (dto.type === LiveSessionTypeEnum.PRIVATE && defaultMaxStudents !== 1) {
      throw new BadRequestException("Private schedules hold one student per slot");
    }

    await this.assertNoOverlap(actorId, slots, null);

    const scheduleId = await this.prisma.$transaction(async (tx) => {
      const schedule = await tx.studySchedule.create({
        data: {
          teacherId: actorId,
          name: dto.name,
          type: dto.type,
          maxStudents: defaultMaxStudents,
        },
      });
      await tx.teacherAvailability.createMany({
        data: slots.map((slot) => ({
          teacherId: actorId,
          scheduleId: schedule.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          gradeId: dto.gradeId ?? null,
          maxStudents: slot.maxStudents,
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
    const daySlots = Array.isArray(dto.days)
      ? (dto.days as {
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          maxStudents?: number;
        }[]).map((day) => {
          const start = toAvailabilityDate(day.startTime);
          const end = toAvailabilityDate(day.endTime);
          if (!isValidWindow(start, end)) {
            throw new BadRequestException(
              `End time must be after start time on day ${DAY_NAMES[day.dayOfWeek]}`,
            );
          }
          return {
            dayOfWeek: day.dayOfWeek,
            startTime: start,
            endTime: end,
            maxStudents: day.maxStudents ?? maxStudents ?? 1,
          };
        })
      : undefined;

    if (daySlots && daySlots.length > 0) {
      await this.assertNoOverlap(schedule.teacherId, daySlots, id);
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

      if (daySlots) {
        const existing = await tx.teacherAvailability.findMany({
          where: { scheduleId: id, deletedAt: null },
          select: { id: true, dayOfWeek: true },
        });
        const existingMap = new Map(existing.map((e) => [e.dayOfWeek, e]));
        for (const slot of daySlots) {
          const row = existingMap.get(slot.dayOfWeek);
          if (row) {
            await tx.teacherAvailability.update({
              where: { id: row.id },
              data: {
                startTime: slot.startTime,
                endTime: slot.endTime,
                ...(type !== undefined ? { type } : {}),
                ...(maxStudents !== undefined ? { maxStudents } : {}),
                ...(effectiveFrom !== undefined ? { effectiveFrom } : {}),
                ...(effectiveTo !== undefined ? { effectiveTo } : {}),
              },
            });
          } else {
            const base = await tx.teacherAvailability.findFirst({
              where: { scheduleId: id, deletedAt: null },
              select: { gradeId: true, maxStudents: true, type: true },
            });
            await tx.teacherAvailability.create({
              data: {
                teacherId: schedule.teacherId,
                scheduleId: id,
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
                gradeId: base?.gradeId ?? null,
                maxStudents: slot.maxStudents,
                type: type ?? base?.type ?? LiveSessionTypeEnum.PRIVATE,
                isRecurring: true,
              },
            });
          }
        }
        for (const existingRow of existing) {
          if (!daySlots.some((s) => s.dayOfWeek === existingRow.dayOfWeek)) {
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
    slots: {
      dayOfWeek: number;
      startTime: Date;
      endTime: Date;
    }[],
    excludeScheduleId: string | null,
  ): Promise<void> {
    const days = [...new Set(slots.map((s) => s.dayOfWeek))];
    const existing = await this.prisma.teacherAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek: { in: days },
        deletedAt: null,
        ...(excludeScheduleId ? { scheduleId: { not: excludeScheduleId } } : {}),
      },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });
    for (const slot of slots) {
      const overlapping = existing.find(
        (a) =>
          a.dayOfWeek === slot.dayOfWeek &&
          circularWindowsOverlap(slot.startTime, slot.endTime, a.startTime, a.endTime),
      );
      if (overlapping) {
        throw new BadRequestException(
          `Schedule overlaps an existing window on ${DAY_NAMES[overlapping.dayOfWeek]} (${toTimeOfDay(overlapping.startTime)}-${toTimeOfDay(overlapping.endTime)})`,
        );
      }
    }
  }
}
