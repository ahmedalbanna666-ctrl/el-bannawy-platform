import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { ReportsRepository } from "./reports.repository";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, RolesGuard, ReportsRepository],
  exports: [ReportsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ReportsModule {}

