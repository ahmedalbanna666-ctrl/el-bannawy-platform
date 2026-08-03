import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QuizRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.quiz.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.quiz.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.quiz.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.quiz.count({ where });
  }
}

