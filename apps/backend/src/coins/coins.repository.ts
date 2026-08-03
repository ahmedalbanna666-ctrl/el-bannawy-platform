import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CoinPackage } from "@prisma/client";

@Injectable()
export class CoinsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CoinPackage | null> {
    return this.prisma.coinPackage.findUnique({ where: { id } });
  }

  async findFirst(where: Record<string, unknown>): Promise<CoinPackage | null> {
    return this.prisma.coinPackage.findFirst({ where });
  }

  async findMany(where?: Record<string, unknown>): Promise<CoinPackage[]> {
    return this.prisma.coinPackage.findMany({ where });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.prisma.coinPackage.count({ where });
  }
}

