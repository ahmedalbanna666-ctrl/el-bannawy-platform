import { Injectable, BadRequestException } from "@nestjs/common";
import type { Express } from "express";
import { PronunciationRepository } from "./pronunciation.repository";
import { GoptPronunciationProvider } from "./providers/gopt-pronunciation.provider";
import { ForcedAlignmentPronunciationProvider } from "./providers/forced-alignment-pronunciation.provider";
import { AsrPronunciationProvider } from "./providers/asr-pronunciation.provider";
import { ScoringAdapter } from "./providers/scoring.adapter";
import type { PronunciationProvider } from "./providers/pronunciation-provider.interface";
import type {
  PronunciationAssessmentResult,
  PronunciationAssessInput,
  PronunciationEngineName,
} from "./pronunciation.types";
import type { AssessPronunciationDto } from "./dto/assess-pronunciation.dto";
import type { Prisma } from "@prisma/client";

export interface PronunciationAssessResponse extends PronunciationAssessmentResult {
  id: string;
}

@Injectable()
export class PronunciationService {
  constructor(
    private readonly repository: PronunciationRepository,
    private readonly gopt: GoptPronunciationProvider,
    private readonly forced: ForcedAlignmentPronunciationProvider,
    private readonly asr: AsrPronunciationProvider,
    private readonly scoring: ScoringAdapter,
  ) {}

  private selectProvider(name?: PronunciationEngineName): PronunciationProvider {
    switch (name) {
      case "forced-alignment":
        return this.forced;
      case "asr":
        return this.asr;
      case "local":
        return this.gopt;
      case "gopt":
      default:
        return this.gopt;
    }
  }

  private parseReferencePhonemes(value?: string): string[] | undefined {
    if (!value) return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === "string");
      }
    } catch {
      throw new BadRequestException("صيغة الرموز الصوتية غير صحيحة");
    }
    return undefined;
  }

  async assess(
    userId: string,
    file: Express.Multer.File,
    dto: AssessPronunciationDto,
  ): Promise<PronunciationAssessResponse> {
    const provider = this.selectProvider(dto.provider);
    const referencePhonemes = this.parseReferencePhonemes(dto.referencePhonemes);

    const input: PronunciationAssessInput = {
      userId,
      expectedText: dto.expectedText,
      audioBuffer: file.buffer,
      audioFormat: file.mimetype || "audio/wav",
      fileName: file.originalname || "recording.wav",
      provider: dto.provider,
      referencePhonemes,
      sampleRate: dto.sampleRate,
      language: dto.language,
    };

    const raw = await provider.assess(input);
    const result = this.scoring.normalize(raw);

    const saved = await this.repository.create({
      userId,
      expectedText: dto.expectedText,
      transcript: result.transcript,
      audioFormat: file.mimetype,
      overallScore: result.overallScore,
      accuracy: result.accuracy,
      fluency: result.fluency,
      prosody: result.prosody,
      completeness: result.completeness,
      engine: result.engine,
      phonemes: result.phonemes.map((p) => p.symbol).join(" "),
      wordFeedback: result.words as unknown as Prisma.InputJsonValue,
      phonemeFeedback: result.phonemes as unknown as Prisma.InputJsonValue,
      rawResult: result as unknown as Prisma.InputJsonValue,
    });

    return { id: saved.id, ...result };
  }

  // Explicit return type kept intentionally minimal; history rows are Prisma entities.
  listHistory(userId: string): Promise<unknown> {
    return this.repository.findManyByUser(userId);
  }
}
