import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PronunciationRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.PronunciationAttemptCreateInput) {
    return this.prisma.pronunciationAttempt.create({ data });
  }
  findManyByUser(userId: string) {
    return this.prisma.pronunciationAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
