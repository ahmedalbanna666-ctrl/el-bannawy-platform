import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiRepository } from "./ai.repository";
import { AiSettingsModule } from "../ai-settings/ai-settings.module";
import { AiKnowledgeBaseModule } from "../ai-knowledge-base/ai-knowledge-base.module";

@Module({
  imports: [AiSettingsModule, AiKnowledgeBaseModule],
  controllers: [AiController],
  providers: [AiService, AiRepository],
  exports: [AiService],
})
export class AiModule {}
