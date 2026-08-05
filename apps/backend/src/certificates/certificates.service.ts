import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { FILE_STORAGE, type FileStorage } from "../common/storage/file-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface IssueCertificateInput {
  fileName: string;
  mimeType?: string;
  data: string;
}

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
  ) {}

  async getConfig(): Promise<unknown> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "certificate_threshold" },
    });
    return { threshold: Number(setting?.value ?? 80) };
  }

  async list(userId: string): Promise<unknown[]> {
    return this.prisma.unitCertificate.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      include: {
        unit: { select: { id: true, title: true, displayOrder: true } },
      },
    });
  }

  /**
   * Compute the student's progress for every unit in their curriculum and
   * return the units whose progress meets the certificate threshold but for
   * which no certificate has been issued yet.
   */
  async listEligibleUnits(userId: string): Promise<{ unitId: string; title: string; displayOrder: number; progress: number }[]> {
    const ctx = await this.academicContext.getStudentContext(userId);
    if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) return [];

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "certificate_threshold" },
    });
    const threshold = Number(setting?.value ?? 80);

    const units = await this.prisma.unit.findMany({
      where: {
        unitType: "UNIT",
        published: true,
        gradeId: ctx.gradeId,
        academicYearId: ctx.academicYearId,
        termId: ctx.termId,
        ...(ctx.educationalSystem
          ? {
              OR: [
                { educationalSystem: ctx.educationalSystem },
                { educationalSystem: null },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        displayOrder: true,
        lessons: { where: { published: true }, select: { id: true } },
      },
    });

    const issuedUnitIds = new Set(
      (await this.prisma.unitCertificate.findMany({
        where: { userId },
        select: { unitId: true },
      })).map((c) => c.unitId),
    );

    const lessonProgressRows = await this.prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(lessonProgressRows.map((r) => r.lessonId));

    const eligible: { unitId: string; title: string; displayOrder: number; progress: number }[] = [];
    for (const unit of units) {
      if (issuedUnitIds.has(unit.id)) continue;
      const total = unit.lessons.length;
      if (total === 0) continue;
      const completed = unit.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progress = Math.round((completed / total) * 100);
      if (progress >= threshold) {
        eligible.push({ unitId: unit.id, title: unit.title, displayOrder: unit.displayOrder, progress });
      }
    }

    return eligible;
  }

  async issue(userId: string, unitId: string, dto: IssueCertificateInput): Promise<unknown> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        lessons: { where: { published: true }, select: { id: true } },
      },
    });
    if (!unit) throw new NotFoundException("Unit not found");

    const ctx = await this.academicContext.getStudentContext(userId);
    if (!ctx?.gradeId || unit.gradeId !== ctx.gradeId) {
      throw new ForbiddenException("Unit is not part of your curriculum");
    }

    const lessonIds = unit.lessons.map((l) => l.id);
    const completedCount = lessonIds.length > 0
      ? await this.prisma.lessonProgress.count({
          where: { userId, lessonId: { in: lessonIds }, completed: true },
        })
      : 0;
    const total = lessonIds.length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "certificate_threshold" },
    });
    const threshold = Number(setting?.value ?? 80);
    if (progress < threshold) {
      throw new ForbiddenException(
        `Progress must reach ${String(threshold)}% to receive a certificate`,
      );
    }

    const existing = await this.prisma.unitCertificate.findUnique({
      where: { userId_unitId: { userId, unitId } },
      include: {
        unit: { select: { id: true, title: true, displayOrder: true } },
      },
    });
    if (existing) return existing;

    const buffer = Buffer.from(dto.data, "base64");
    if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException("Invalid certificate file");
    }

    const { fileUrl } = await this.fileStorage.save(buffer, dto.fileName, `${userId}-${unitId}`, "certificates");

    return this.prisma.unitCertificate.create({
      data: {
        userId,
        unitId,
        fileName: dto.fileName,
        fileUrl,
        fileSize: buffer.length,
        mimeType: dto.mimeType ?? "application/pdf",
      },
      include: {
        unit: { select: { id: true, title: true, displayOrder: true } },
      },
    });
  }

  async getFile(
    userId: string,
    id: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const cert = await this.prisma.unitCertificate.findFirst({ where: { id, userId } });
    if (!cert) throw new NotFoundException("Certificate not found");

    const buffer = await this.fileStorage.read(cert.fileUrl).catch(() => {
      throw new NotFoundException("File not found");
    });

    return { buffer, fileName: cert.fileName, mimeType: cert.mimeType };
  }
}
