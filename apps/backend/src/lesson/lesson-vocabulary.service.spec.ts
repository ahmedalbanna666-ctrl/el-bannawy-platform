import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { LessonService } from "./lesson.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { VocabularyPreviewService } from "../document-import/services/vocabulary-preview.service";

type MockPrismaService = {
  lessonVocabulary: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  lesson: {
    findUnique: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  lessonProgress: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockAcademicContext = {
  verifyTeacherLessonAccess: jest.Mock;
  verifyStudentLessonAccess: jest.Mock;
};

function createMockPrisma(): MockPrismaService {
  return {
    lessonVocabulary: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    lesson: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    lessonProgress: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function createMockAcademicContext(): MockAcademicContext {
  return {
    verifyTeacherLessonAccess: jest.fn().mockResolvedValue(undefined),
    verifyStudentLessonAccess: jest.fn().mockResolvedValue(undefined),
  };
}

describe("LessonService — Vocabulary", () => {
  let service: LessonService;
  let prisma: MockPrismaService;
  let academic: MockAcademicContext;

  const lessonId = "00000000-0000-0000-0000-000000000001";
  const vocabId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";
  const otherLessonId = "00000000-0000-0000-0000-000000000099";

  const baseDto = { word: "hello", translation: "مرحبا" };
  const fullDto = {
    word: "achieve",
    translation: "يحقق",
    definition: "to succeed in doing something",
    example: "She worked hard to achieve her goal.",
  };
  const baseVocab = { id: vocabId, lessonId, ...baseDto, definition: null, example: null, partOfSpeech: null, displayOrder: 0, createdAt: new Date() };
  const fullVocab = { id: vocabId, lessonId, ...fullDto, partOfSpeech: null, displayOrder: 0, createdAt: new Date() };

  beforeEach(async () => {
    prisma = createMockPrisma();
    academic = createMockAcademicContext();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        { provide: PrismaService, useValue: prisma },
        { provide: AcademicContextService, useValue: academic },
        { provide: VocabularyPreviewService, useValue: { preview: jest.fn() } },
      ],
    }).compile();

    service = module.get(LessonService);
  });

  // ── V1: CREATE ──────────────────────────────────────────────────────

  describe("addVocabulary", () => {
    it("verifies teacher lesson access", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      await service.addVocabulary(lessonId, baseDto, userId);
      expect(academic.verifyTeacherLessonAccess).toHaveBeenCalledWith(userId, lessonId);
    });

    it("trims word and translation before persistence", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      await service.addVocabulary(lessonId, { word: "  hello  ", translation: "  مرحبا  " }, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ word: "hello", translation: "مرحبا" }),
        }),
      );
    });

    it("persists definition and example when provided", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(fullVocab);
      await service.addVocabulary(lessonId, fullDto, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            definition: fullDto.definition,
            example: fullDto.example,
          }),
        }),
      );
    });

    it("persists null for empty definition and example", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      await service.addVocabulary(lessonId, { ...baseDto, definition: "", example: "   " }, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ definition: null, example: null }),
        }),
      );
    });

    it("persists partOfSpeech when provided", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue({ ...baseVocab, partOfSpeech: "n" });
      await service.addVocabulary(lessonId, { ...baseDto, partOfSpeech: " n " }, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: "n" }),
        }),
      );
    });

    it("persists null partOfSpeech when omitted", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      await service.addVocabulary(lessonId, baseDto, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: null }),
        }),
      );
    });

    it("persists null for empty partOfSpeech", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      await service.addVocabulary(lessonId, { ...baseDto, partOfSpeech: "" }, userId);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: null }),
        }),
      );
    });

    it("returns the created item", async () => {
      prisma.lessonVocabulary.create.mockResolvedValue(baseVocab);
      const result = await service.addVocabulary(lessonId, baseDto, userId);
      expect(result).toEqual(baseVocab);
    });

    it("performs zero Prisma mutation on access failure", async () => {
      academic.verifyTeacherLessonAccess.mockRejectedValue(new ForbiddenException());
      await expect(service.addVocabulary(lessonId, baseDto, userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.lessonVocabulary.create).not.toHaveBeenCalled();
    });
  });

  // ── V5 + V6: UPDATE ────────────────────────────────────────────────

  describe("updateVocabulary", () => {
    it("updates supplied fields on authorized lesson item", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      prisma.lessonVocabulary.update.mockResolvedValue({ ...baseVocab, translation: "ينجز" });
      const result = await service.updateVocabulary(lessonId, vocabId, { translation: "ينجز" }, userId);
      expect(academic.verifyTeacherLessonAccess).toHaveBeenCalledWith(userId, lessonId);
      expect(prisma.lessonVocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: vocabId },
          data: { translation: "ينجز" },
        }),
      );
      expect(result).toEqual({ ...baseVocab, translation: "ينجز" });
    });

    it("preserves stable item identity", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      const updated = { ...baseVocab, translation: "ينجز" };
      prisma.lessonVocabulary.update.mockResolvedValue(updated);
      const result = await service.updateVocabulary(lessonId, vocabId, { translation: "ينجز" }, userId);
      const typed = result as typeof updated;
      expect(typed.id).toBe(vocabId);
      expect(typed.word).toBe(baseVocab.word);
    });

    it("rejects cross-lesson update attempt", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(null);
      await expect(
        service.updateVocabulary(otherLessonId, vocabId, { translation: "x" }, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lessonVocabulary.update).not.toHaveBeenCalled();
    });

    it("rejects unknown vocabId", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(null);
      await expect(
        service.updateVocabulary(lessonId, "nonexistent-id", { translation: "x" }, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lessonVocabulary.update).not.toHaveBeenCalled();
    });

    it("converts empty definition/example to null", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      prisma.lessonVocabulary.update.mockResolvedValue({ ...baseVocab, definition: null });
      await service.updateVocabulary(lessonId, vocabId, { definition: "", example: "  " }, userId);
      expect(prisma.lessonVocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ definition: null, example: null }),
        }),
      );
    });

    it("preserves partOfSpeech when updating other fields", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue({ ...baseVocab, partOfSpeech: "n" });
      prisma.lessonVocabulary.update.mockResolvedValue({ ...baseVocab, partOfSpeech: "n", translation: "new" });
      await service.updateVocabulary(lessonId, vocabId, { translation: "new" }, userId);
      expect(prisma.lessonVocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { translation: "new" },
        }),
      );
    });

    it("clears partOfSpeech when sent as empty string", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue({ ...baseVocab, partOfSpeech: "n" });
      prisma.lessonVocabulary.update.mockResolvedValue({ ...baseVocab, partOfSpeech: null });
      await service.updateVocabulary(lessonId, vocabId, { partOfSpeech: "" }, userId);
      expect(prisma.lessonVocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: null }),
        }),
      );
    });

    it("trims partOfSpeech before persistence", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      prisma.lessonVocabulary.update.mockResolvedValue({ ...baseVocab, partOfSpeech: "n" });
      await service.updateVocabulary(lessonId, vocabId, { partOfSpeech: "  n  " }, userId);
      expect(prisma.lessonVocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: "n" }),
        }),
      );
    });

    it("rejects empty update payload", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      await expect(
        service.updateVocabulary(lessonId, vocabId, {}, userId),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lessonVocabulary.update).not.toHaveBeenCalled();
    });

    it("performs zero mutation on access failure", async () => {
      academic.verifyTeacherLessonAccess.mockRejectedValue(new ForbiddenException());
      await expect(
        service.updateVocabulary(lessonId, vocabId, { translation: "x" }, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.lessonVocabulary.findFirst).not.toHaveBeenCalled();
      expect(prisma.lessonVocabulary.update).not.toHaveBeenCalled();
    });
  });

  // ── V3 + V4 + V5: DELETE ───────────────────────────────────────────

  describe("deleteVocabulary", () => {
    it("succeeds when item belongs to authorized lesson", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(baseVocab);
      await service.deleteVocabulary(lessonId, vocabId, userId);
      expect(academic.verifyTeacherLessonAccess).toHaveBeenCalledWith(userId, lessonId);
      expect(prisma.lessonVocabulary.delete).toHaveBeenCalledWith({ where: { id: vocabId } });
    });

    it("rejects when item belongs to different lesson", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteVocabulary(otherLessonId, vocabId, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lessonVocabulary.delete).not.toHaveBeenCalled();
    });

    it("rejects unknown vocabId", async () => {
      prisma.lessonVocabulary.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteVocabulary(lessonId, "nonexistent-id", userId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lessonVocabulary.delete).not.toHaveBeenCalled();
    });

    it("performs zero deletion on access failure", async () => {
      academic.verifyTeacherLessonAccess.mockRejectedValue(new ForbiddenException());
      await expect(
        service.deleteVocabulary(lessonId, vocabId, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.lessonVocabulary.findFirst).not.toHaveBeenCalled();
      expect(prisma.lessonVocabulary.delete).not.toHaveBeenCalled();
    });
  });

  // ── COMMIT ──────────────────────────────────────────────────────────

  describe("commitVocabularyImport", () => {
    const commitItem = { word: "hello", translation: "مرحبا" };
    const commitItem2 = { word: "world", translation: "عالم" };

    it("verifies teacher lesson access", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(lessonId, { items: [commitItem] }, userId);
      expect(academic.verifyTeacherLessonAccess).toHaveBeenCalledWith(userId, lessonId);
    });

    it("creates items in a transaction", async () => {
      const txSpy = jest.fn();
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        txSpy();
        return fn(prisma);
      });
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(lessonId, { items: [commitItem] }, userId);
      expect(txSpy).toHaveBeenCalled();
    });

    it("deletes specified existing items", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(
        lessonId,
        { items: [commitItem], removeVocabIds: [vocabId] },
        userId,
      );
      expect(prisma.lessonVocabulary.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: [vocabId] }, lessonId } }),
      );
    });

    it("replaces existing item when replaceVocabId is set", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(
        lessonId,
        { items: [{ ...commitItem, replaceVocabId: vocabId }] },
        userId,
      );
      expect(prisma.lessonVocabulary.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: vocabId } }),
      );
    });

    it("creates all new items with displayOrder", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(
        lessonId,
        { items: [commitItem, commitItem2] },
        userId,
      );
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledTimes(2);
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ word: "hello", displayOrder: 0 }),
        }),
      );
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ word: "world", displayOrder: 1 }),
        }),
      );
    });

    it("returns the final vocabulary list", async () => {
      const finalList = [{ id: "new-id", lessonId, word: "hello", translation: "مرحبا", definition: null, example: null, displayOrder: 0, createdAt: new Date() }];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue(finalList);
      const result = await service.commitVocabularyImport(lessonId, { items: [commitItem] }, userId);
      expect(result).toEqual(finalList);
    });

    it("performs zero mutation on access failure", async () => {
      academic.verifyTeacherLessonAccess.mockRejectedValue(new ForbiddenException());
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      await expect(
        service.commitVocabularyImport(lessonId, { items: [commitItem] }, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("persists partOfSpeech during commit", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(
        lessonId,
        { items: [{ ...commitItem, partOfSpeech: "n" }] },
        userId,
      );
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: "n" }),
        }),
      );
    });

    it("persists null partOfSpeech when omitted in commit", async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.lessonVocabulary.findMany.mockResolvedValue([]);
      await service.commitVocabularyImport(
        lessonId,
        { items: [commitItem] },
        userId,
      );
      expect(prisma.lessonVocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partOfSpeech: null }),
        }),
      );
    });
  });
});
