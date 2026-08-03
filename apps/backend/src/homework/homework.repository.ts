import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HomeworkRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.homework.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.homework.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.homework.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.homework.count({ where });
  }
}

