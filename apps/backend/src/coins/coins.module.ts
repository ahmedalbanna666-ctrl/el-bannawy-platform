import { Module } from "@nestjs/common";
import { CoinsController } from "./coins.controller";
import { CoinsService } from "./coins.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { CoinsRepository } from "./coins.repository";
import { ReferralModule } from "../referral/referral.module";

@Module({
  imports: [ReferralModule],
  controllers: [CoinsController],
  providers: [CoinsService, RolesGuard, CoinsRepository],
  exports: [CoinsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS module container
export class CoinsModule {}

