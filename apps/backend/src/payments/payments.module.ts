import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { PaymentsRepository } from "./payments.repository";
import { ReferralModule } from "../referral/referral.module";

@Module({
  imports: [ReferralModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RolesGuard, PaymentsRepository],
  exports: [PaymentsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PaymentsModule {}

