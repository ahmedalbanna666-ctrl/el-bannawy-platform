import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateGradeSupportContactDto } from "../admin/dto/update-grade-support-contact.dto";

@Injectable()
export class GradeSupportContactService {
  constructor(private readonly prisma: PrismaService) {}

  async getContacts(userId: string, gradeId?: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, gradeId: true },
    });
    if (!user) throw new NotFoundException("User not found");

    if (user.role === "ADMINISTRATOR") {
      const where = gradeId ? { id: gradeId } : {};
      return this.prisma.grade.findMany({
        where,
        select: { id: true, name: true, supportPhone: true, supportEmail: true, supportWhatsapp: true },
        orderBy: { displayOrder: "asc" },
      });
    }

    if (user.role === "TEACHER") {
      const teacherGrades = await this.prisma.teacherGrade.findMany({
        where: { userId },
        select: { gradeId: true },
      });
      const teacherGradeIds = teacherGrades.map((tg) => tg.gradeId);
      if (gradeId && !teacherGradeIds.includes(gradeId)) return [];
      const where = gradeId ? { id: gradeId } : { id: { in: teacherGradeIds } };
      return this.prisma.grade.findMany({
        where,
        select: { id: true, name: true, supportPhone: true, supportEmail: true, supportWhatsapp: true },
        orderBy: { displayOrder: "asc" },
      });
    }

    if (!user.gradeId) return [];
    return this.prisma.grade.findMany({
      where: { id: user.gradeId },
      select: { id: true, name: true, supportPhone: true, supportEmail: true, supportWhatsapp: true },
    });
  }

  async updateContact(
    actorId: string,
    gradeId: string,
    dto: UpdateGradeSupportContactDto,
  ): Promise<unknown> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (!actor) throw new NotFoundException("User not found");

    const grade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade) throw new NotFoundException("Grade not found");

    if (actor.role === "TEACHER") {
      const isAssigned = await this.prisma.teacherGrade.findUnique({
        where: { userId_gradeId: { userId: actorId, gradeId } },
      });
      if (!isAssigned) throw new ForbiddenException("You are not assigned to this grade");
    }

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        ...(dto.supportPhone !== undefined && { supportPhone: dto.supportPhone ?? null }),
        ...(dto.supportEmail !== undefined && { supportEmail: dto.supportEmail ?? null }),
        ...(dto.supportWhatsapp !== undefined && { supportWhatsapp: dto.supportWhatsapp ?? null }),
      },
      select: { id: true, name: true, supportPhone: true, supportEmail: true, supportWhatsapp: true },
    });
  }
}
