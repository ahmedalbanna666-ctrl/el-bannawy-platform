import { Injectable } from "@nestjs/common";
import { PronunciationEngineClient } from "../engine/pronunciation-engine.client";
import type { PronunciationProvider } from "./pronunciation-provider.interface";
import type { PronunciationAssessInput, PronunciationAssessmentResult } from "../pronunciation.types";

@Injectable()
export class GoptPronunciationProvider implements PronunciationProvider {
  readonly name = "gopt" as const;

  constructor(private readonly engine: PronunciationEngineClient) {}

  assess(input: PronunciationAssessInput): Promise<PronunciationAssessmentResult> {
    return this.engine.assess({
      audioBuffer: input.audioBuffer,
      audioFormat: input.audioFormat,
      fileName: input.fileName,
      expectedText: input.expectedText,
      provider: "gopt",
      referencePhonemes: input.referencePhonemes,
      sampleRate: input.sampleRate,
      language: input.language,
    });
  }
}
