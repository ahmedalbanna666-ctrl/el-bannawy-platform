import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { VideoQuestionController } from "./video-question.controller";
import { VideoQuestionService } from "./video-question.service";
import { VideoQuestionRepository } from "./video-question.repository";
import { VideoQuestionMapper } from "./video-question.mapper";
import { VideoQuestionValidator } from "./video-question.validator";
import { VideoQuestionExecutor } from "./video-question.executor";
import { VideoQuestionHandler } from "./video-question.handler";
import { VideoQuestionExecutionPlugin } from "./video-question.execution-plugin";
import { VideoEventModule } from "../video-event/video-event.module";
import { VideoEventRegistryService } from "../video-event/registry/video-event-registry.service";
import { ExecutionModule } from "../execution/execution.module";
import { ExecutionRegistryService } from "../execution/execution-registry.service";

@Module({
  imports: [VideoEventModule, ExecutionModule],
  controllers: [VideoQuestionController],
  providers: [
    VideoQuestionService,
    VideoQuestionRepository,
    VideoQuestionMapper,
    VideoQuestionValidator,
    VideoQuestionExecutor,
    VideoQuestionHandler,
    VideoQuestionExecutionPlugin,
  ],
  exports: [
    VideoQuestionService,
    VideoQuestionRepository,
    VideoQuestionMapper,
    VideoQuestionHandler,
  ],
})
export class VideoQuestionModule implements OnModuleInit {
  constructor(
    @Inject(VideoEventRegistryService)
    private readonly eventRegistry: VideoEventRegistryService,
    @Inject(VideoQuestionHandler)
    private readonly handler: VideoQuestionHandler,
    @Inject(ExecutionRegistryService)
    private readonly executionRegistry: ExecutionRegistryService,
    @Inject(VideoQuestionExecutionPlugin)
    private readonly executionPlugin: VideoQuestionExecutionPlugin,
  ) {}

  onModuleInit(): void {
    this.eventRegistry.register(this.handler);
    this.executionRegistry.register(this.executionPlugin);
  }
}
