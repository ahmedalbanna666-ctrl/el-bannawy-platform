import { Module } from "@nestjs/common";
import { PageStatusController } from "./page-status.controller";
import { PageStatusService } from "./page-status.service";

@Module({
  controllers: [PageStatusController],
  providers: [PageStatusService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PageStatusModule {}
