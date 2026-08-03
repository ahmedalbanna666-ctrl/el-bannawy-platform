import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivityRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.activity.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.activity.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.activity.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.activity.count({ where });
  }
}

