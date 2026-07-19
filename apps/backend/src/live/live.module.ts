import { Module } from "@nestjs/common";
import { LiveController } from "./live.controller";
import { LiveService } from "./live.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [LiveController],
  providers: [LiveService, RolesGuard],
  exports: [LiveService],
})
export class LiveModule {}
