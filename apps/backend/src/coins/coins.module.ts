import { Module } from "@nestjs/common";
import { CoinsController } from "./coins.controller";
import { CoinsService } from "./coins.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [CoinsController],
  providers: [CoinsService, RolesGuard],
  exports: [CoinsService],
})
export class CoinsModule {}
