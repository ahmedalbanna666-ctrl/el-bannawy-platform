import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RolesGuard],
  exports: [NotificationsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationsModule {}
