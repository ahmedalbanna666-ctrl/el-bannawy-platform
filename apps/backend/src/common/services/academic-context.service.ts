import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface StudentContext {
  academicYearId: string | null;
  termId: string | null;
  gradeId: string | null;
  stageId: string | null;
  educationalSystem: string | null;
}

export interface ActiveAcademicContext {
  academicYearId: string | null;
  termId: string | null;
}

@Injectable()
export class AcademicContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherGradeIds(userId: string): Promise<Set<string>> {
    const assignments = await this.prisma.teacherGrade.findMany({
      where: { userId },
      select: { gradeId: true },
    });
    return new Set(assignments.map((a) => a.gradeId));
  }

  async verifyTeacherGradeAccess(userId: string, gradeId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "ADMINISTRATOR") return;
    const gradeIds = await this.getTeacherGradeIds(userId);
    if (!gradeIds.has(gradeId)) {
      throw new ForbiddenException("You are not assigned to this grade");
    }
  }

  async verifyTeacherUnitAccess(userId: string, unitId: string): Promise<void> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { gradeId: true },
    });
    if (!unit) throw new NotFoundException("Unit not found");
    await this.verifyTeacherGradeAccess(userId, unit.gradeId);
  }

  async verifyTeacherLessonAccess(userId: string, lessonId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { unit: { select: { gradeId: true } } },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.verifyTeacherGradeAccess(userId, lesson.unit.gradeId);
  }

  async verifyStudentLessonAccess(userId: string, lessonId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        gradeId: true,
        academicYearId: true,
        termId: true,
        educationalSystem: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "STUDENT") return;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        unit: {
          select: {
            gradeId: true,
            academicYearId: true,
            termId: true,
            educationalSystem: true,
            grade: { select: { stageId: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    if (!user.gradeId || !user.academicYearId || !user.termId) {
      throw new ForbiddenException("No academic context assigned. Please complete your profile.");
    }

    const mismatches: string[] = [];

    if (user.gradeId !== lesson.unit.gradeId) {
      mismatches.push("grade");
    }
    if (user.academicYearId !== lesson.unit.academicYearId) {
      mismatches.push("academic year");
    }
    if (user.termId !== lesson.unit.termId) {
      mismatches.push("term");
    }
    if (user.educationalSystem && lesson.unit.educationalSystem && user.educationalSystem !== lesson.unit.educationalSystem) {
      mismatches.push("educational system");
    }

    if (mismatches.length > 0) {
      throw new ForbiddenException(
        `You do not have access to this lesson (context mismatch: ${mismatches.join(", ")})`,
      );
    }
  }

  async getStudentContext(userId: string): Promise<StudentContext | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        academicYearId: true,
        termId: true,
        gradeId: true,
        educationalSystem: true,
      },
    });
    if (!user) return null;

    let stageId: string | null = null;
    if (user.gradeId) {
      const grade = await this.prisma.grade.findUnique({
        where: { id: user.gradeId },
        select: { stageId: true },
      });
      stageId = grade?.stageId ?? null;
    }

    return {
      academicYearId: user.academicYearId,
      termId: user.termId,
      gradeId: user.gradeId,
      stageId,
      educationalSystem: user.educationalSystem,
    };
  }

  buildAcademicFilter(ctx: StudentContext | null): Record<string, unknown> {
    if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) return {};
    return {
      unit: {
        gradeId: ctx.gradeId,
        academicYearId: ctx.academicYearId,
        termId: ctx.termId,
        ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
      },
    };
  }

  async getActiveAcademicContext(): Promise<ActiveAcademicContext> {
    const [activeYearSetting, activeTermSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: "active_academic_year_id" } }),
      this.prisma.systemSetting.findUnique({ where: { key: "active_term_id" } }),
    ]);

    return {
      academicYearId: activeYearSetting?.value ?? null,
      termId: activeTermSetting?.value ?? null,
    };
  }
}
