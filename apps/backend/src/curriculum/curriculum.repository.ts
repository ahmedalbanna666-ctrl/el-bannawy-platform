import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Lesson } from "@prisma/client";

@Injectable()
export class CurriculumRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Lesson | null> {
    return this.prisma.lesson.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({ where });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.prisma.lesson.count({ where });
  }
}

