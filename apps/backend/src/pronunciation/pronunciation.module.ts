import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PronunciationController } from "./pronunciation.controller";
import { PronunciationService } from "./pronunciation.service";
import { PronunciationRepository } from "./pronunciation.repository";
import { PronunciationEngineClient } from "./engine/pronunciation-engine.client";
import { PRONUNCIATION_ENGINE_URL } from "./pronunciation.constants";
import { GoptPronunciationProvider } from "./providers/gopt-pronunciation.provider";
import { ForcedAlignmentPronunciationProvider } from "./providers/forced-alignment-pronunciation.provider";
import { AsrPronunciationProvider } from "./providers/asr-pronunciation.provider";
import { ScoringAdapter } from "./providers/scoring.adapter";

@Module({
  imports: [ConfigModule],
  controllers: [PronunciationController],
  providers: [
    PronunciationService,
    PronunciationRepository,
    PronunciationEngineClient,
    GoptPronunciationProvider,
    ForcedAlignmentPronunciationProvider,
    AsrPronunciationProvider,
    ScoringAdapter,
    {
      provide: PRONUNCIATION_ENGINE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string =>
        config.get<string>("PRONUNCIATION_ENGINE_URL") ??
        "http://ml-pronunciation:8000",
    },
  ],
  exports: [PronunciationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PronunciationModule {}
