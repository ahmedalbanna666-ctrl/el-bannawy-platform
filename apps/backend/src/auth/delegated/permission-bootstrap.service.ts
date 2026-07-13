import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DelegatedPermissionService } from "./delegated-permission.service";

@Injectable()
export class PermissionBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PermissionBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delegatedPermissionService: DelegatedPermissionService,
  ) {}

  async onModuleInit(): Promise<void> {
    const admin = await this.prisma.user.findFirst({
      where: { role: "ADMINISTRATOR", deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const actorId = admin?.id;
    if (!actorId) {
      this.logger.warn(
        "No ADMINISTRATOR account found; skipping legacy teacher permission backfill",
      );
      return;
    }

    const count = await this.delegatedPermissionService.backfillLegacyTeachers(actorId);
    if (count > 0) {
      this.logger.log(`Legacy teacher permission backfill initialized ${String(count)} teacher(s)`);
    }
  }
}
