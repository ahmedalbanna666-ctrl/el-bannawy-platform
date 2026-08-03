import { Test, type TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { CacheService } from "../common/services/cache.service";

function createMockPrisma() {
  const tx = {
    activityFindUnique: jest.fn(),
    activityCount: jest.fn(),
    activityProgressFindUnique: jest.fn(),
    activityProgressUpsert: jest.fn(),
    activityProgressCount: jest.fn(),
    lessonVideoFindUnique: jest.fn(),
    lessonVideoFindMany: jest.fn(),
    videoProgressFindMany: jest.fn(),
    lessonProgressUpsert: jest.fn(),
  };

  const prisma = {
    activity: { findUnique: tx.activityFindUnique, count: tx.activityCount },
    activityProgress: { findUnique: tx.activityProgressFindUnique, upsert: tx.activityProgressUpsert, count: tx.activityProgressCount },
    lessonVideo: { findUnique: tx.lessonVideoFindUnique, findMany: tx.lessonVideoFindMany },
    videoProgress: { findMany: tx.videoProgressFindMany },
    lessonProgress: { upsert: tx.lessonProgressUpsert },
  } as unknown as PrismaService;

  return { prisma, tx };
}

describe("ActivityService", () => {
  let service: ActivityService;
  let tx: ReturnType<typeof createMockPrisma>["tx"];
  let verifyAccess: jest.Mock;

  beforeEach(async () => {
    const { prisma, tx: t } = createMockPrisma();
    tx = t;
    verifyAccess = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prisma },
        { provide: AcademicContextService, useValue: { verifyStudentLessonAccess: verifyAccess } },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            del: jest.fn(),
            generateKey: jest.fn((prefix: string, ...parts: (string | undefined)[]) => [prefix, ...parts.filter(Boolean)].join(":")),
          },
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe("getActivity", () => {
    it("should throw if not found", async () => {
      tx.activityFindUnique.mockResolvedValue(null);
      await expect(service.getActivity("bad", "uid")).rejects.toThrow(NotFoundException);
    });

    it("should return activity with questions", async () => {
      const fake = { id: "a", title: "Test", type: "MC", questions: [], video: { lessonId: "l" } };
      tx.activityFindUnique.mockResolvedValue(fake);
      const result = await service.getActivity("a", "uid");
      expect(result).toEqual(fake);
      expect(verifyAccess).toHaveBeenCalledWith("uid", "l");
    });
  });

  describe("startActivity", () => {
    it("should throw if not found", async () => {
      tx.activityFindUnique.mockResolvedValue(null);
      await expect(service.startActivity("bad", "uid")).rejects.toThrow(NotFoundException);
    });

    it("should upsert progress", async () => {
      tx.activityFindUnique.mockResolvedValue({ id: "a", video: { lessonId: "l" } });
      tx.activityProgressUpsert.mockResolvedValue({ completed: false });
      const r = await service.startActivity("a", "uid");
      expect(r).toEqual({ completed: false });
    });
  });

  describe("submitActivity", () => {
    const base = { id: "a", type: "MC", config: null, videoId: "v", questions: [], video: { lessonId: "l" } };

    it("should throw if not found", async () => {
      tx.activityFindUnique.mockResolvedValue(null);
      await expect(service.submitActivity("bad", "uid")).rejects.toThrow(NotFoundException);
    });

    it("should grade from config.correctAnswer", async () => {
      tx.activityFindUnique.mockResolvedValue({ ...base, config: JSON.stringify({ correctAnswer: "paris" }) });
      tx.lessonVideoFindUnique.mockResolvedValue({ lessonId: "l" });
      tx.activityProgressUpsert.mockResolvedValue({});
      tx.lessonVideoFindMany.mockResolvedValue([]);
      tx.activityCount.mockResolvedValue(0);
      const r = await service.submitActivity("a", "uid", undefined, ["Paris"]) as { score: number; passed: boolean };
      expect(r.score).toBe(100);
      expect(r.passed).toBe(true);
    });

    it("should mark wrong as 0", async () => {
      tx.activityFindUnique.mockResolvedValue({ ...base, config: JSON.stringify({ correctAnswer: "london" }) });
      tx.lessonVideoFindUnique.mockResolvedValue({ lessonId: "l" });
      tx.activityProgressUpsert.mockResolvedValue({});
      tx.lessonVideoFindMany.mockResolvedValue([]);
      tx.activityCount.mockResolvedValue(0);
      const r = await service.submitActivity("a", "uid", undefined, ["Berlin"]) as { score: number; passed: boolean };
      expect(r.score).toBe(0);
      expect(r.passed).toBe(false);
    });

    it("should grade from questions", async () => {
      tx.activityFindUnique.mockResolvedValue({
        ...base, questions: [
          { correctAnswer: "red", displayOrder: 1 },
          { correctAnswer: "blue", displayOrder: 2 },
        ],
      });
      tx.lessonVideoFindUnique.mockResolvedValue({ lessonId: "l" });
      tx.activityProgressUpsert.mockResolvedValue({});
      tx.lessonVideoFindMany.mockResolvedValue([]);
      tx.activityCount.mockResolvedValue(0);
      const r = await service.submitActivity("a", "uid", undefined, ["red", "blue"]) as { score: number };
      expect(r.score).toBe(100);
    });

    it("should handle partial correct", async () => {
      tx.activityFindUnique.mockResolvedValue({
        ...base, questions: [
          { correctAnswer: "red", displayOrder: 1 },
          { correctAnswer: "blue", displayOrder: 2 },
        ],
      });
      tx.lessonVideoFindUnique.mockResolvedValue({ lessonId: "l" });
      tx.activityProgressUpsert.mockResolvedValue({});
      tx.lessonVideoFindMany.mockResolvedValue([]);
      tx.activityCount.mockResolvedValue(0);
      const r = await service.submitActivity("a", "uid", undefined, ["red", "green"]) as { score: number };
      expect(r.score).toBe(50);
    });
  });

  describe("getActivityProgress", () => {
    it("should throw if not found", async () => {
      tx.activityFindUnique.mockResolvedValue(null);
      await expect(service.getActivityProgress("bad", "uid")).rejects.toThrow(NotFoundException);
    });

    it("should return default if none", async () => {
      tx.activityFindUnique.mockResolvedValue({ id: "a", video: { lessonId: "l" } });
      tx.activityProgressFindUnique.mockResolvedValue(null);
      const r = await service.getActivityProgress("a", "uid");
      expect(r).toEqual({ completed: false, score: null });
    });

    it("should return existing progress", async () => {
      tx.activityFindUnique.mockResolvedValue({ id: "a", video: { lessonId: "l" } });
      tx.activityProgressFindUnique.mockResolvedValue({ completed: true, score: 85 });
      const r = await service.getActivityProgress("a", "uid");
      expect(r).toEqual({ completed: true, score: 85 });
    });
  });
});
