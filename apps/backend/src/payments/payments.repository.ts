import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>) {
    return this.prisma.payment.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>) {
    return this.prisma.payment.findMany({ where });
  }

  async count(where?: Record<string, unknown>) {
    return this.prisma.payment.count({ where });
  }
}

