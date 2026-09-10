import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { PronunciationController } from "./pronunciation.controller";
import { PronunciationService } from "./pronunciation.service";
import { PronunciationRepository } from "./pronunciation.repository";
import { PronunciationEngineClient } from "./engine/pronunciation-engine.client";
import { PRONUNCIATION_ENGINE_URL } from "./pronunciation.constants";

@Module({
  imports: [PrismaModule],
  controllers: [PronunciationController],
  providers: [
    PronunciationService,
    PronunciationRepository,
    PronunciationEngineClient,
    { provide: PRONUNCIATION_ENGINE_URL, useFactory: (cfg: ConfigService) => cfg.get<string>("PRONUNCIATION_ENGINE_URL", "http://ml-pronunciation:8000"), inject: [ConfigService] },
  ],
  exports: [PronunciationService],
})
export class PronunciationModule {}
