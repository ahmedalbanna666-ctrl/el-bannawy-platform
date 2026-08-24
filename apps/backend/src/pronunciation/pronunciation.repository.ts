import { Injectable } from "@nestjs/common";
import type { Prisma, PronunciationAttempt } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface CreatePronunciationAttemptInput {
  userId: string;
  expectedText: string;
  transcript?: string | null;
  audioFormat?: string | null;
  overallScore?: number | null;
  accuracy?: number | null;
  fluency?: number | null;
  prosody?: number | null;
  completeness?: number | null;
  engine: string;
  phonemes?: string | null;
  wordFeedback?: Prisma.InputJsonValue;
  phonemeFeedback?: Prisma.InputJsonValue;
  rawResult?: Prisma.InputJsonValue;
}

@Injectable()
export class PronunciationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePronunciationAttemptInput): Promise<PronunciationAttempt> {
    return this.prisma.pronunciationAttempt.create({
      data: {
        userId: data.userId,
        expectedText: data.expectedText,
        transcript: data.transcript,
        audioFormat: data.audioFormat,
        overallScore: data.overallScore,
        accuracy: data.accuracy,
        fluency: data.fluency,
        prosody: data.prosody,
        completeness: data.completeness,
        engine: data.engine,
        phonemes: data.phonemes,
        wordFeedback: data.wordFeedback ?? {},
        phonemeFeedback: data.phonemeFeedback ?? {},
        rawResult: data.rawResult ?? {},
      },
    });
  }

  findManyByUser(userId: string, limit = 20): Promise<PronunciationAttempt[]> {
    return this.prisma.pronunciationAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
