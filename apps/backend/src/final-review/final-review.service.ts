import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { AuditService } from "../common/services/audit.service";
import type { CreateFinalReviewDto, UpdateFinalReviewDto, PublishDto, CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from "./dto/final-review.dto";

@Injectable()
export class FinalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly audit: AuditService,
  ) {}

  async getForManagement(userId: string, academicYearId?: string, termId?: string, gradeId?: string, educationalSystem?: string) {
    const gradeIds = await this.academicContext.getTeacherGradeIds(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return this.prisma.finalReview.findMany({
      orderBy: { displayOrder: "asc" },
      where: {
        deletedAt: null,
        AND: [{ gradeId: { in: user?.role === "ADMINISTRATOR" ? undefined : [...gradeIds] } },
          ...(gradeId ? [{ gradeId }] : []), ...(academicYearId ? [{ academicYearId }] : []),
          ...(termId ? [{ termId }] : []), ...(educationalSystem ? [{ educationalSystem }] : []),
        ],
      },
      include: { grade: { include: { stage: { select: { id: true, name: true } } } }, _count: { select: { sections: true } } },
    });
  }

  async getForManagementById(id: string, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id }, include: { grade: { include: { stage: { select: { id: true, name: true } } } }, sections: { orderBy: { displayOrder: "asc" } } } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    return fr;
  }

  async create(dto: CreateFinalReviewDto, userId: string) {
    await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);
    await this.validateContext(dto.academicYearId, dto.termId);
    const fr = await this.prisma.finalReview.create({ data: { ...dto, description: dto.description ?? null, coverImageUrl: dto.coverImageUrl ?? null, displayOrder: dto.displayOrder ?? 0 } });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_CREATED", entity: "FinalReview", entityId: fr.id });
    return fr;
  }

  async update(id: string, dto: UpdateFinalReviewDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id }, select: { id: true, gradeId: true, academicYearId: true, termId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    if (dto.academicYearId || dto.termId || dto.gradeId) { if (dto.gradeId) await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId); await this.validateContext(dto.academicYearId ?? fr.academicYearId, dto.termId ?? fr.termId); }
    const updated = await this.prisma.finalReview.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_UPDATED", entity: "FinalReview", entityId: id });
    return updated;
  }

  async delete(id: string, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    await this.prisma.finalReview.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_DELETED", entity: "FinalReview", entityId: id });
  }

  async publish(id: string, dto: PublishDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    const updated = await this.prisma.finalReview.update({ where: { id }, data: { published: dto.published } });
    await this.audit.log({ actorId: userId, action: dto.published ? "FINAL_REVIEW_PUBLISHED" : "FINAL_REVIEW_UNPUBLISHED", entity: "FinalReview", entityId: id });
    return updated;
  }

  async createSection(frId: string, dto: CreateSectionDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id: frId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    const s = await this.prisma.finalReviewSection.create({ data: { finalReviewId: frId, title: dto.title, description: dto.description ?? null, questionCount: dto.questionCount ?? 0, durationMinutes: dto.durationMinutes ?? 0, displayOrder: dto.displayOrder ?? 0 } });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_SECTION_CREATED", entity: "FinalReviewSection", entityId: s.id });
    return s;
  }

  async updateSection(frId: string, sectionId: string, dto: UpdateSectionDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id: frId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    const s = await this.prisma.finalReviewSection.findFirst({ where: { id: sectionId, finalReviewId: frId } });
    if (!s) throw new NotFoundException("Section not found");
    const updated = await this.prisma.finalReviewSection.update({ where: { id: sectionId }, data: dto });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_SECTION_UPDATED", entity: "FinalReviewSection", entityId: sectionId });
    return updated;
  }

  async deleteSection(frId: string, sectionId: string, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id: frId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    await this.prisma.finalReviewSection.delete({ where: { id: sectionId } });
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_SECTION_DELETED", entity: "FinalReviewSection", entityId: sectionId });
  }

  async publishSection(frId: string, sectionId: string, dto: PublishDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id: frId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    const updated = await this.prisma.finalReviewSection.update({ where: { id: sectionId }, data: { published: dto.published } });
    await this.audit.log({ actorId: userId, action: dto.published ? "FINAL_REVIEW_SECTION_PUBLISHED" : "FINAL_REVIEW_SECTION_UNPUBLISHED", entity: "FinalReviewSection", entityId: sectionId });
    return updated;
  }

  async reorderSections(frId: string, dto: ReorderSectionsDto, userId: string) {
    const fr = await this.prisma.finalReview.findUnique({ where: { id: frId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!fr || fr.deletedAt) throw new NotFoundException("Final review not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, fr.gradeId);
    const sections = await this.prisma.finalReviewSection.findMany({ where: { finalReviewId: frId }, select: { id: true } });
    const existing = new Set(sections.map(s => s.id));
    for (const id of dto.sectionIds) { if (!existing.has(id)) throw new BadRequestException(`Section ${id} not in this review`); }
    await this.prisma.$transaction(dto.sectionIds.map((id, i) => this.prisma.finalReviewSection.update({ where: { id }, data: { displayOrder: i } })));
    await this.audit.log({ actorId: userId, action: "FINAL_REVIEW_SECTIONS_REORDERED", entity: "FinalReview", entityId: frId });
  }

  async getForStudent(userId: string) {
    const ctx = await this.academicContext.getStudentContext(userId);
    if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) throw new ForbiddenException("Academic context not assigned");
    return this.prisma.finalReview.findMany({
      orderBy: { displayOrder: "asc" },
      where: { published: true, deletedAt: null, gradeId: ctx.gradeId, academicYearId: ctx.academicYearId, termId: ctx.termId, ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}) },
      include: { sections: { where: { published: true }, orderBy: { displayOrder: "asc" } } },
    });
  }

  async getForStudentById(id: string, userId: string) {
    const ctx = await this.academicContext.getStudentContext(userId);
    if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) throw new ForbiddenException("Academic context not assigned");
    const fr = await this.prisma.finalReview.findUnique({ where: { id }, include: { sections: { where: { published: true }, orderBy: { displayOrder: "asc" } } } });
    if (!fr || fr.deletedAt || !fr.published) throw new NotFoundException("Final review not found");
    if (fr.gradeId !== ctx.gradeId || fr.academicYearId !== ctx.academicYearId || fr.termId !== ctx.termId) throw new ForbiddenException("Not in your academic context");
    if (ctx.educationalSystem && fr.educationalSystem !== ctx.educationalSystem) throw new ForbiddenException("Not in your educational system");
    return fr;
  }

  private async validateContext(academicYearId: string, termId: string) {
    const y = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!y) throw new BadRequestException("Academic year not found");
    const t = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!t) throw new BadRequestException("Term not found");
    if (t.academicYearId !== academicYearId) throw new BadRequestException("Term does not belong to academic year");
  }
}
