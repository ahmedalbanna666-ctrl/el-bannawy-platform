import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  BroadcastAppointment,
  BroadcastReminder,
  BroadcastStudent,
} from "./interfaces/broadcast.interface";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const TIME_ZONE = "Africa/Cairo";

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Normalize to international digits without "+": "01…" → "201…". */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("01")) digits = `2${digits}`;
  if (digits.length < 10) return null;
  return digits;
}

@Injectable()
export class BroadcastService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents(): Promise<{ data: BroadcastStudent[] }> {
    const users = await this.prisma.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        assignedGrade: { select: { name: true, stage: { select: { name: true } } } },
      },
      orderBy: { fullName: "asc" },
    });
    const data: BroadcastStudent[] = [];
    for (const u of users) {
      const phone = normalizePhone(u.mobileNumber);
      if (!phone) continue;
      data.push({
        id: u.id,
        name: u.fullName,
        phone,
        stage: u.assignedGrade?.stage?.name ?? u.assignedGrade?.name ?? "غير محدد",
      });
    }
    return { data };
  }

  private parseDate(date: string): Date {
    if (!DATE_RE.test(date)) throw new BadRequestException("Invalid date, expected YYYY-MM-DD");
    const day = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Invalid date, expected YYYY-MM-DD");
    return day;
  }

  async getAppointments(date: string): Promise<{ data: BroadcastAppointment[] }> {
    const day = this.parseDate(date);
    const sessions = await this.prisma.liveSession.findMany({
      where: {
        startTime: { gte: new Date(day.getTime() - DAY_MS), lt: new Date(day.getTime() + 2 * DAY_MS) },
        cancelledAt: null,
        deletedAt: null,
        archivedAt: null,
      },
      include: {
        grade: { include: { stage: { select: { name: true } } } },
        lesson: { select: { title: true } },
      },
      orderBy: { startTime: "asc" },
    });
    const data: BroadcastAppointment[] = sessions
      .filter((s) => dayFmt.format(s.startTime) === date)
      .map((s) => ({
        stage: s.grade?.stage?.name ?? s.grade?.name ?? "كل المراحل",
        subject: s.lesson?.title ?? s.title,
        time: timeFmt.format(s.startTime),
        room: s.meetingUrl || s.zoomJoinUrl ? "أونلاين" : "غير محدد",
        date,
      }));
    return { data };
  }

  async getReminders(date: string): Promise<{ data: BroadcastReminder[] }> {
    this.parseDate(date);
    // TODO: BroadcastReminder model not yet in Prisma schema — return empty until migration is added
    return { data: [] };
  }
}
