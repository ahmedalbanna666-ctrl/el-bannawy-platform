import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface MyGradesResponse {
  gradeIds: string[];
  grades: Array<{
    id: string;
    name: string;
    stage: { id: string; name: string };
    _count?: { users: number };
  }>;
}

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyGrades(userId: string): Promise<MyGradesResponse> {
    const assignments = await this.prisma.teacherGrade.findMany({
      where: { userId },
      include: {
        grade: {
          include: {
            stage: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { grade: { displayOrder: "asc" } },
    });

    const grades = assignments.map((a) => ({
      id: a.grade.id,
      name: a.grade.name,
      stage: { id: a.grade.stage.id, name: a.grade.stage.name },
    }));

    return {
      gradeIds: assignments.map((a) => a.gradeId),
      grades,
    };
  }
}
