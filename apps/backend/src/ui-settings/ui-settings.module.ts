import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { UiSettingsController } from "./ui-settings.controller";
import { UiSettingsService } from "./ui-settings.service";

@Module({
  imports: [PrismaModule],
  controllers: [UiSettingsController],
  providers: [UiSettingsService],
  exports: [UiSettingsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS module container
export class UiSettingsModule {}
