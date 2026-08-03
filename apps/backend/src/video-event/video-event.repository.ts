import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VideoEventRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.videoEvent.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.videoEvent.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.videoEvent.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.videoEvent.count({ where });
  }
}

