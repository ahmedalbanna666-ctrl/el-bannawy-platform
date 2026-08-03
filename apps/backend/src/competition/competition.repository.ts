import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompetitionRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.competition.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.competition.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.competition.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.competition.count({ where });
  }
}

