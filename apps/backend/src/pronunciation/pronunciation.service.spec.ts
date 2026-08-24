import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PronunciationService } from "./pronunciation.service";
import { PronunciationRepository } from "./pronunciation.repository";
import { GoptPronunciationProvider } from "./providers/gopt-pronunciation.provider";
import { ForcedAlignmentPronunciationProvider } from "./providers/forced-alignment-pronunciation.provider";
import { AsrPronunciationProvider } from "./providers/asr-pronunciation.provider";
import { ScoringAdapter } from "./providers/scoring.adapter";
import type { PronunciationAssessmentResult } from "./pronunciation.types";

function fakeResult(): PronunciationAssessmentResult {
  return {
    overallScore: 80,
    accuracy: 85,
    fluency: 70,
    prosody: 75,
    completeness: 100,
    transcript: "hello",
    engine: "gopt",
    words: [
      {
        word: "hello",
        score: 90,
        accuracy: 90,
        fluency: 90,
        errorType: "none",
        phonemes: [{ symbol: "HH", score: 95, errorType: "none" }],
      },
    ],
    phonemes: [{ symbol: "HH", score: 95, errorType: "none" }],
  };
}

describe("PronunciationService", () => {
  let service: PronunciationService;
  let repository: { create: jest.Mock };

  const gopt = { name: "gopt" as const, assess: jest.fn().mockResolvedValue(fakeResult()) };
  const forced = { name: "forced-alignment" as const, assess: jest.fn() };
  const asr = { name: "asr" as const, assess: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository = { create: jest.fn().mockResolvedValue({ id: "attempt-1" }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PronunciationService,
        { provide: PronunciationRepository, useValue: repository },
        { provide: GoptPronunciationProvider, useValue: gopt },
        { provide: ForcedAlignmentPronunciationProvider, useValue: forced },
        { provide: AsrPronunciationProvider, useValue: asr },
        ScoringAdapter,
      ],
    }).compile();
    service = module.get(PronunciationService);
  });

  it("assesses via gopt provider, persists and returns normalized result", async () => {
    const file = {
      buffer: Buffer.from("RIFF"),
      mimetype: "audio/wav",
      originalname: "r.wav",
      size: 4,
    } as unknown as Express.Multer.File;

    const res = await service.assess("user-1", file, { expectedText: "hello" });

    expect(gopt.assess).toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalled();
    expect(res.id).toBe("attempt-1");
    expect(res.overallScore).toBe(80);
    expect(res.words[0].feedback).toBeDefined();
  });

  it("selects forced-alignment provider when requested", async () => {
    forced.assess.mockResolvedValueOnce(fakeResult());
    const file = {
      buffer: Buffer.from("RIFF"),
      mimetype: "audio/wav",
      originalname: "r.wav",
      size: 4,
    } as unknown as Express.Multer.File;

    await service.assess("user-1", file, { expectedText: "hello", provider: "forced-alignment" });

    expect(forced.assess).toHaveBeenCalled();
    expect(gopt.assess).not.toHaveBeenCalled();
  });

  it("rejects malformed reference phonemes", async () => {
    const file = {
      buffer: Buffer.from("RIFF"),
      mimetype: "audio/wav",
      originalname: "r.wav",
      size: 4,
    } as unknown as Express.Multer.File;

    await expect(
      service.assess("user-1", file, {
        expectedText: "hello",
        referencePhonemes: "not-json",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
