import { Module } from "@nestjs/common";
import { GradeScheduleController } from "./grade-schedule.controller";
import { GradeScheduleService } from "./grade-schedule.service";

@Module({
  controllers: [GradeScheduleController],
  providers: [GradeScheduleService],
  exports: [GradeScheduleService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GradeScheduleModule {}
