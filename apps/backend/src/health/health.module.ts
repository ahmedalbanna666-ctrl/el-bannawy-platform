import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { HealthService } from "./health.service";
import { MetricsService } from "../common/services/metrics.service";
@Module({
  imports: [PrismaModule],
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService],
  exports: [MetricsService],
})
export class HealthModule {}

