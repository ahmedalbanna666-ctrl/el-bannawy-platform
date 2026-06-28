import { Module } from "@nestjs/common";
import { HomeworkController } from "./homework.controller";
import { HomeworkService } from "./homework.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [HomeworkController],
  providers: [HomeworkService, RolesGuard],
  exports: [HomeworkService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HomeworkModule {}
