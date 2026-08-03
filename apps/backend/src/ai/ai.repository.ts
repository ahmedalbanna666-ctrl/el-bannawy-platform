import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AiRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.conversation.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.conversation.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.conversation.count({ where });
  }
}

