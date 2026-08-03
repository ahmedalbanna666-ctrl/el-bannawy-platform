import { Module } from "@nestjs/common";
import { ReferralController } from "./referral.controller";
import { ReferralService } from "./referral.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [ReferralController],
  providers: [ReferralService, RolesGuard],
  exports: [ReferralService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ReferralModule {}
