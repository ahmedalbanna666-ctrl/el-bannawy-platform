import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateVideoEventDto } from "./dto/create-video-event.dto";
import type { UpdateVideoEventDto } from "./dto/update-video-event.dto";

@Injectable()
export class VideoEventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVideoEventDto): Promise<unknown> {
    return this.prisma.videoEvent.create({
      data: {
        videoId: dto.videoId,
        timestamp: dto.timestamp,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? "",
        required: dto.required ?? false,
        enabled: dto.enabled ?? true,
        displayOrder: dto.displayOrder ?? 0,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findByVideoId(videoId: string): Promise<unknown[]> {
    return this.prisma.videoEvent.findMany({
      where: { videoId },
      orderBy: { timestamp: "asc" },
    });
  }

  async findByVideoIdAndType(videoId: string, type: string): Promise<unknown[]> {
    return this.prisma.videoEvent.findMany({
      where: { videoId, type },
      orderBy: { timestamp: "asc" },
    });
  }

  async findById(id: string): Promise<unknown> {
    const event = await this.prisma.videoEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("Video event not found");
    return event;
  }

  async update(id: string, dto: UpdateVideoEventDto): Promise<unknown> {
    const existing = await this.prisma.videoEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Video event not found");
    const data: Record<string, unknown> = {};
    if (dto.timestamp !== undefined) data.timestamp = dto.timestamp;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.required !== undefined) data.required = dto.required;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.payload !== undefined) data.payload = dto.payload;
    return this.prisma.videoEvent.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.videoEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Video event not found");
    await this.prisma.videoEvent.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<unknown[]> {
    const updates = ids.map((id, index) =>
      this.prisma.videoEvent.update({
        where: { id },
        data: { displayOrder: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async findByTimestamp(videoId: string, timestamp: number): Promise<unknown[]> {
    return this.prisma.videoEvent.findMany({
      where: {
        videoId,
        enabled: true,
        timestamp: { lte: timestamp },
      },
      orderBy: { timestamp: "asc" },
    });
  }
}
