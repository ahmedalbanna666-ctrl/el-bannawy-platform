import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AcademicContextService } from "./academic-context.service";
import { PrismaService } from "../../prisma/prisma.service";

type MockPrismaService = {
  teacherGrade: {
    findMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  unit: {
    findUnique: jest.Mock;
  };
  lesson: {
    findUnique: jest.Mock;
  };
  grade: {
    findUnique: jest.Mock;
  };
  systemSetting: {
    findUnique: jest.Mock;
  };
  $disconnect: jest.Mock;
};

function createMockPrisma(): MockPrismaService {
  return {
    teacherGrade: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    unit: { findUnique: jest.fn() },
    lesson: { findUnique: jest.fn() },
    grade: { findUnique: jest.fn() },
    systemSetting: { findUnique: jest.fn() },
    $disconnect: jest.fn(),
  };
}

describe("AcademicContextService", () => {
  let service: AcademicContextService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicContextService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AcademicContextService);
  });

  describe("getActiveAcademicContext", () => {
    it("returns active academic year and term when both settings exist", async () => {
      prisma.systemSetting.findUnique.mockImplementation(
        (args: { where: { key: string } }) => {
          if (args.where.key === "active_academic_year_id")
            return { value: "year-123" };
          if (args.where.key === "active_term_id")
            return { value: "term-456" };
          return null;
        },
      );

      const result = await service.getActiveAcademicContext();

      expect(result.academicYearId).toBe("year-123");
      expect(result.termId).toBe("term-456");
    });

    it("returns nulls when no settings exist", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getActiveAcademicContext();

      expect(result.academicYearId).toBeNull();
      expect(result.termId).toBeNull();
    });
  });

  describe("getTeacherGradeIds", () => {
    it("returns set of grade IDs for assigned teacher", async () => {
      prisma.teacherGrade.findMany.mockResolvedValue([
        { gradeId: "g-1" },
        { gradeId: "g-2" },
      ]);

      const result = await service.getTeacherGradeIds("teacher-id");

      expect(result).toBeInstanceOf(Set);
      expect(result.has("g-1")).toBe(true);
      expect(result.has("g-2")).toBe(true);
      expect(result.size).toBe(2);
    });

    it("returns empty set for teacher with no assignments", async () => {
      prisma.teacherGrade.findMany.mockResolvedValue([]);

      const result = await service.getTeacherGradeIds("unassigned-teacher");

      expect(result.size).toBe(0);
    });
  });

  describe("verifyTeacherGradeAccess", () => {
    it("allows ADMINISTRATOR without checking assignments", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "ADMINISTRATOR" });

      await expect(
        service.verifyTeacherGradeAccess("admin-id", "any-grade"),
      ).resolves.toBeUndefined();
      expect(prisma.teacherGrade.findMany).not.toHaveBeenCalled();
    });

    it("allows TEACHER when assigned to the grade", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "TEACHER" });
      prisma.teacherGrade.findMany.mockResolvedValue([
        { gradeId: "assigned-grade" },
      ]);

      await expect(
        service.verifyTeacherGradeAccess("teacher-id", "assigned-grade"),
      ).resolves.toBeUndefined();
    });

    it("rejects TEACHER when not assigned to the grade", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "TEACHER" });
      prisma.teacherGrade.findMany.mockResolvedValue([
        { gradeId: "assigned-grade" },
      ]);

      await expect(
        service.verifyTeacherGradeAccess("teacher-id", "other-grade"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("verifyTeacherUnitAccess", () => {
    it("rejects with NotFoundException when unit does not exist", async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyTeacherUnitAccess("teacher-id", "nonexistent-unit"),
      ).rejects.toThrow(NotFoundException);
    });

    it("delegates to verifyTeacherGradeAccess for existing unit", async () => {
      prisma.unit.findUnique.mockResolvedValue({ gradeId: "grade-1" });
      prisma.user.findUnique.mockResolvedValue({ role: "TEACHER" });
      prisma.teacherGrade.findMany.mockResolvedValue([
        { gradeId: "grade-1" },
      ]);

      await expect(
        service.verifyTeacherUnitAccess("teacher-id", "valid-unit"),
      ).resolves.toBeUndefined();
    });
  });

  describe("buildAcademicFilter", () => {
    it("returns empty filter when ctx is null", () => {
      const result = service.buildAcademicFilter(null);
      expect(result).toEqual({});
    });

    it("returns empty filter when gradeId is missing", () => {
      const result = service.buildAcademicFilter({
        gradeId: null,
        academicYearId: "year-1",
        termId: "term-1",
        stageId: "stage-1",
        educationalSystem: "system-1",
      });
      expect(result).toEqual({});
    });

    it("builds complete filter when all context fields present", () => {
      const result = service.buildAcademicFilter({
        gradeId: "grade-1",
        academicYearId: "year-1",
        termId: "term-1",
        stageId: "stage-1",
        educationalSystem: "egypt",
      });

      expect(result).toEqual({
        unit: {
          gradeId: "grade-1",
          academicYearId: "year-1",
          termId: "term-1",
          educationalSystem: "egypt",
        },
      });
    });
  });
});
