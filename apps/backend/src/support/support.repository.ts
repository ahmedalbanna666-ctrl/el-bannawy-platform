import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupportRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.supportTicket.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.supportTicket.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.supportTicket.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.supportTicket.count({ where });
  }
}

