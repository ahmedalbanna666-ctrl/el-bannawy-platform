import { Injectable } from "@nestjs/common";
import type { Express } from "express";
import { PronunciationRepository } from "./pronunciation.repository";
import { PronunciationEngineClient } from "./engine/pronunciation-engine.client";
import type { PronunciationAssessmentResult } from "./pronunciation.types";
import type { AssessPronunciationDto } from "./dto/assess-pronunciation.dto";
import type { Prisma } from "@prisma/client";

export interface PronunciationAssessResponse extends PronunciationAssessmentResult { id: string; }

@Injectable()
export class PronunciationService {
  constructor(private readonly repo: PronunciationRepository, private readonly engine: PronunciationEngineClient) {}

  async assess(userId: string, file: Express.Multer.File, dto: AssessPronunciationDto): Promise<PronunciationAssessResponse> {
    const result = await this.engine.assess({
      audioBuffer: file.buffer,
      audioFormat: file.mimetype || "audio/wav",
      fileName: file.originalname || "recording.wav",
      expectedText: dto.expectedText,
      language: dto.language,
    });
    const saved = await this.repo.create({
      user: { connect: { id: userId } },
      expectedText: dto.expectedText,
      transcript: result.transcript,
      audioFormat: file.mimetype,
      overallScore: result.overallScore,
      accuracy: result.accuracy,
      fluency: result.fluency,
      prosody: result.prosody,
      completeness: result.completeness,
      engine: result.engine,
      wordFeedback: result.words as unknown as Prisma.InputJsonValue,
      phonemeFeedback: result.phonemes as unknown as Prisma.InputJsonValue,
      rawResult: result as unknown as Prisma.InputJsonValue,
    } as unknown as Prisma.PronunciationAttemptCreateInput);
    return { id: saved.id, ...result };
  }

  listHistory(userId: string) { return this.repo.findManyByUser(userId); }
}
