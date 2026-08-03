import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HomeRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.user.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.user.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.user.count({ where });
  }
}

