import { Module, Global } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { WhatsAppService } from "./whatsapp.service";
import { FcmService } from "./fcm.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { NotificationsRepository } from "./notifications.repository";
import { ScheduledNotificationsProcessor } from "./scheduled-notifications.processor";

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WhatsAppService,
    FcmService,
    RolesGuard,
    NotificationsRepository,
    ScheduledNotificationsProcessor,
  ],
  exports: [NotificationsService, WhatsAppService, FcmService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationsModule {}
