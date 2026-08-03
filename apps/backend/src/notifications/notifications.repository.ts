import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string): Promise<unknown> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>): Promise<unknown> {
    return this.prisma.notification.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>): Promise<unknown[]> {
    return this.prisma.notification.findMany({ where });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.prisma.notification.count({ where });
  }
}

