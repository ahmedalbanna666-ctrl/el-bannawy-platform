import { Module } from "@nestjs/common";
import { StoryController } from "./story.controller";
import { StoryService } from "./story.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [StoryController],
  providers: [StoryService, RolesGuard],
})
export class StoryModule {}
