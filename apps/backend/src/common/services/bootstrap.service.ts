import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async bootstrapNewStudent(userId: string): Promise<void> {
    const existing = await this.prisma.coinWallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      this.logger.log(`Bootstrap skipped for ${userId} — already initialized`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.coinWallet.create({
        data: { userId, balance: 0 },
      });

      const firstLesson = await tx.lesson.findFirst({
        where: { published: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true },
      });

      if (firstLesson) {
        await tx.lessonProgress.create({
          data: {
            userId,
            lessonId: firstLesson.id,
            progress: 0,
            completed: false,
            startedAt: new Date(),
          },
        });
      }

      await tx.notificationPreference.create({
        data: { userId },
      });
    });

    this.logger.log(`Bootstrap complete for user ${userId}`);
  }
}
