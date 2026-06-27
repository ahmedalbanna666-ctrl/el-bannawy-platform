import { Module } from "@nestjs/common";
import { ActivityController } from "./activity.controller";
import { ActivityService } from "./activity.service";

@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ActivityModule {}
