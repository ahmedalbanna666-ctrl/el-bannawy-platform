import { Module } from "@nestjs/common";
import { SocialLinksController } from "./social-links.controller";
import { SocialLinksService } from "./social-links.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [],
  controllers: [SocialLinksController],
  providers: [SocialLinksService, RolesGuard],
  exports: [SocialLinksService],
})
export class SocialLinksModule {}
