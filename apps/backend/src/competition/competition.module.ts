import { Module } from "@nestjs/common";
import { CompetitionController } from "./competition.controller";
import { CompetitionService } from "./competition.service";
import { DelegatedPermissionModule } from "../auth/delegated/delegated-permission.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommonModule } from "../common/common.module";
import { RolesGuard } from "../common/guards/roles.guard";
import { PermissionGuard } from "../common/guards/permission.guard";

@Module({
  controllers: [CompetitionController],
  providers: [CompetitionService, RolesGuard, PermissionGuard],
  imports: [DelegatedPermissionModule, NotificationsModule, CommonModule],
  exports: [CompetitionService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CompetitionModule {}
