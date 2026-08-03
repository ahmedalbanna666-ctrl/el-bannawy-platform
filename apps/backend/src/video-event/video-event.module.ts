import { Module } from "@nestjs/common";
import { VideoEventController } from "./video-event.controller";
import { VideoEventService } from "./video-event.service";
import { VideoEventRegistryService } from "./registry/video-event-registry.service";
import { VideoEventDispatcherService } from "./dispatcher/video-event-dispatcher.service";
import { ExecutionModule } from "../execution/execution.module";
import { VideoEventRepository } from "./video-event.repository";

@Module({
  imports: [ExecutionModule],
  controllers: [VideoEventController],
  providers: [VideoEventService, VideoEventRegistryService, VideoEventDispatcherService, VideoEventRepository],
  exports: [VideoEventService, VideoEventRegistryService, VideoEventDispatcherService],
})
export class VideoEventModule {}

