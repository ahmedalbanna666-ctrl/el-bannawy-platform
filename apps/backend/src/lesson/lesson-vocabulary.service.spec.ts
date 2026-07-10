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
  const baseVocab = { id: vocabId, lessonId, ...baseDto, definition: null, example: null, displayOrder: 0, createdAt: new Date() };
  const fullVocab = { id: vocabId, lessonId, ...fullDto, displayOrder: 0, createdAt: new Date() };

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
});
