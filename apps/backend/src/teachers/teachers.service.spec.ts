import { Test, TestingModule } from "@nestjs/testing";
import { TeachersService, type MyGradesResponse } from "./teachers.service";
import { PrismaService } from "../prisma/prisma.service";

type MockPrismaService = {
  teacherGrade: {
    findMany: jest.Mock;
  };
};

function createMockPrisma(): MockPrismaService {
  return {
    teacherGrade: {
      findMany: jest.fn(),
    },
  };
}

const TEACHER_ID = "00000000-0000-0000-0000-000000000001";

const sampleAssignments = [
  {
    gradeId: "11111111-1111-1111-1111-111111111111",
    grade: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "الصف الأول الابتدائي",
      stage: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "PRIMARY" },
    },
  },
  {
    gradeId: "22222222-2222-2222-2222-222222222222",
    grade: {
      id: "22222222-2222-2222-2222-222222222222",
      name: "الصف الثاني الابتدائي",
      stage: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "PRIMARY" },
    },
  },
];

describe("TeachersService", () => {
  let service: TeachersService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(TeachersService);
  });

  describe("getMyGrades", () => {
    it("returns assigned grades for a teacher with multiple assignments", async () => {
      prisma.teacherGrade.findMany.mockResolvedValue(sampleAssignments);

      const result = await service.getMyGrades(TEACHER_ID);

      expect(prisma.teacherGrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: TEACHER_ID } }),
      );
      expect(result.gradeIds).toEqual([
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ]);
      expect(result.grades).toHaveLength(2);
      expect(result.grades[0].name).toBe("الصف الأول الابتدائي");
      expect(result.grades[0].stage.name).toBe("PRIMARY");
    });

    it("returns empty response for a teacher with zero assignments", async () => {
      prisma.teacherGrade.findMany.mockResolvedValue([]);

      const result = await service.getMyGrades(TEACHER_ID);

      expect(result.gradeIds).toEqual([]);
      expect(result.grades).toEqual([]);
    });

    it("does not return grades belonging to another teacher", async () => {
      prisma.teacherGrade.findMany.mockImplementation(async (args: { where: { userId: string } }) => {
        if (args.where.userId === TEACHER_ID) return sampleAssignments;
        return [];
      });

      const teacherAResult = await service.getMyGrades(TEACHER_ID);
      const otherResult = await service.getMyGrades("99999999-9999-9999-9999-999999999999");

      expect(teacherAResult.gradeIds).toHaveLength(2);
      expect(otherResult.gradeIds).toEqual([]);
    });

    it("returns exact frontend-compatible response shape", async () => {
      prisma.teacherGrade.findMany.mockResolvedValue([sampleAssignments[0]]);

      const result: MyGradesResponse = await service.getMyGrades(TEACHER_ID);

      expect(Array.isArray(result.gradeIds)).toBe(true);
      expect(Array.isArray(result.grades)).toBe(true);
      expect(typeof result.grades[0].id).toBe("string");
      expect(typeof result.grades[0].name).toBe("string");
      expect(typeof result.grades[0].stage.id).toBe("string");
      expect(typeof result.grades[0].stage.name).toBe("string");
    });
  });
});
