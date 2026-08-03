import { Module } from "@nestjs/common";
import { AiSettingsController } from "./ai-settings.controller";
import { AiSettingsService } from "./ai-settings.service";
import { AiProviderService } from "./providers/ai-provider.service";
import { AiCostService } from "./providers/ai-cost.service";

@Module({
  controllers: [AiSettingsController],
  providers: [AiSettingsService, AiProviderService, AiCostService],
  exports: [AiSettingsService, AiProviderService, AiCostService],
})
export class AiSettingsModule {}
