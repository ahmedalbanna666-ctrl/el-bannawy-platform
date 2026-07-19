import { Module } from "@nestjs/common";
import { ExecutionController } from "./execution.controller";
import { ExecutionService } from "./execution.service";
import { ExecutionRegistryService } from "./execution-registry.service";
import { ExecutionPipelineService } from "./pipeline/execution-pipeline.service";

@Module({
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionRegistryService, ExecutionPipelineService],
  exports: [ExecutionService, ExecutionRegistryService, ExecutionPipelineService],
})
export class ExecutionModule {}
