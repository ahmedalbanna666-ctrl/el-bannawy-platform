import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { SESSION_INCLUDE } from "./live.constants";
import {
  MEETING_PROVIDER,
  type MeetingProvider,
} from "./meeting-provider/meeting-provider.interface";

export interface ZoomMeetingDto {
  topic?: string;
  durationMinutes?: number;
  startTime?: string;
  timezone?: string;
  password?: string;
  waitingRoom?: boolean;
  autoRecord?: boolean;
  muteUponEntry?: boolean;
  joinBeforeHost?: boolean;
  hostVideo?: boolean;
  participantVideo?: boolean;
}

@Injectable()
export class LiveZoomMeetingService {
  private readonly logger = new Logger(LiveZoomMeetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
    @Inject(MEETING_PROVIDER) private readonly meetingProvider: MeetingProvider,
  ) {}

  async createZoomMeeting(
    sessionId: string,
    actorId: string,
    role: string,
    dto: ZoomMeetingDto,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: {
        id: true,
        teacherId: true,
        title: true,
        startTime: true,
        durationMinutes: true,
        zoomMeetingId: true,
        meetingProvider: true,
      },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    if (session.zoomMeetingId) {
      throw new BadRequestException("A Zoom meeting is already attached to this session");
    }

    const meeting = await this.meetingProvider.createMeeting({
      topic: dto.topic ?? session.title,
      startTime: dto.startTime ?? session.startTime.toISOString(),
      durationMinutes: dto.durationMinutes ?? session.durationMinutes,
      timezone: dto.timezone ?? "UTC",
      password: dto.password,
      waitingRoom: dto.waitingRoom,
      autoRecord: dto.autoRecord,
      muteUponEntry: dto.muteUponEntry,
      joinBeforeHost: dto.joinBeforeHost,
      hostVideo: dto.hostVideo,
      participantVideo: dto.participantVideo,
    });

    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        meetingProvider: "ZOOM_SDK",
        zoomMeetingId: meeting.meetingNumber,
        zoomPassword: meeting.password ?? dto.password ?? null,
        zoomJoinUrl: meeting.joinUrl,
        waitingRoom: dto.waitingRoom ?? true,
        autoRecord: dto.autoRecord ?? false,
        meetingUrl: meeting.joinUrl ?? null,
      },
      include: SESSION_INCLUDE,
    });

    await this.prisma.liveSessionControlLog.create({
      data: { sessionId, action: "ZOOM_MEETING_CREATED", actorId, details: JSON.stringify({ meetingNumber: meeting.meetingNumber }) },
    });
    return updated;
  }

  async updateZoomMeeting(
    sessionId: string,
    actorId: string,
    role: string,
    dto: ZoomMeetingDto,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true, zoomMeetingId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    if (!session.zoomMeetingId) {
      throw new BadRequestException("No Zoom meeting is attached to this session yet");
    }

    await this.meetingProvider.updateMeeting(session.zoomMeetingId, dto);

    const data: Record<string, unknown> = {};
    if (dto.waitingRoom !== undefined) data.waitingRoom = dto.waitingRoom;
    if (dto.autoRecord !== undefined) data.autoRecord = dto.autoRecord;
    if (dto.password) data.zoomPassword = dto.password;
    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data,
      include: SESSION_INCLUDE,
    });

    await this.prisma.liveSessionControlLog.create({
      data: { sessionId, action: "ZOOM_MEETING_UPDATED", actorId, details: JSON.stringify(Object.keys(dto)) },
    });
    return updated;
  }

  async deleteZoomMeeting(sessionId: string, actorId: string, role: string): Promise<{ id: string }> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true, zoomMeetingId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    if (session.zoomMeetingId) {
      await this.meetingProvider.deleteMeeting(session.zoomMeetingId).catch((err: unknown) => {
        this.logger.warn(`Zoom delete meeting ${String(session.zoomMeetingId)} failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
    await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        zoomMeetingId: null,
        zoomPassword: null,
        zoomJoinUrl: null,
        meetingUrl: null,
        meetingProvider: "EXTERNAL_URL",
      },
    });
    await this.prisma.liveSessionControlLog.create({
      data: { sessionId, action: "ZOOM_MEETING_DELETED", actorId },
    });
    return { id: sessionId };
  }
}
