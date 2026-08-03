import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ManualPaymentController } from "./manual-payment.controller";
import { ManualPaymentService } from "./manual-payment.service";

@Module({
  imports: [PrismaModule],
  controllers: [ManualPaymentController],
  providers: [ManualPaymentService],
  exports: [ManualPaymentService],
})
export class ManualPaymentModule {}
