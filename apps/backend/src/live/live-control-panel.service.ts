import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { SESSION_INCLUDE } from "./live.constants";

@Injectable()
export class LiveControlPanelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
  ) {}

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
    this.access.assertSessionOwner(session, actorId, role);
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
      take: 100,
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async sendAnnouncement(
    sessionId: string,
    senderId: string,
    role: string,
    dto: { message: string; type?: string; pin?: boolean },
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, senderId, role);
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
    this.access.assertSessionOwner(session, actorId, role);
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

  async getControlLogs(sessionId: string, actorId: string, role: string): Promise<unknown[]> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    return this.prisma.liveSessionControlLog.findMany({
      where: { sessionId },
      include: { actor: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
