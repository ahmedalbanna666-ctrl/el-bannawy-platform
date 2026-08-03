import { Module } from "@nestjs/common";
import { ActivityController } from "./activity.controller";
import { ActivityService } from "./activity.service";
import { ActivityRepository } from "./activity.repository";

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityRepository],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ActivityModule {}

