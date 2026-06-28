import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RolesGuard],
  exports: [PaymentsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PaymentsModule {}
