import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { FILE_STORAGE, type FileStorage } from "../common/storage/file-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface IssueCertificateInput {
  fileName: string;
  mimeType?: string;
  data: string;
  verificationCode?: string;
}

export interface EligibleUnit {
  unitId: string;
  title: string;
  displayOrder: number;
  progress: number;
  gradeLabel: string;
  stageName: string | null;
  gradeName: string | null;
  termName: string | null;
  academicYearName: string | null;
  courseName: string;
}

function gradeLabelFromPercent(percent: number): string {
  if (percent >= 90) return "Excellent";
  if (percent >= 80) return "Very Good";
  if (percent >= 70) return "Good";
  if (percent >= 60) return "Pass";
  return "Needs Improvement";
}

function generateVerificationCode(): string {
  const raw = randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `EB-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
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
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        verificationCode: true,
        earnedAt: true,
        unit: { select: { id: true, title: true, displayOrder: true } },
      },
    });
  }

  /**
   * Compute the student's progress for every unit in their curriculum and
   * return the units whose progress meets the certificate threshold but for
   * which no certificate has been issued yet.
   */
  async listEligibleUnits(userId: string): Promise<EligibleUnit[]> {
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
        grade: { select: { name: true, stage: { select: { name: true } } } },
        academicYear: { select: { name: true } },
        term: { select: { name: true } },
        book: { select: { title: true } },
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

    const eligible: EligibleUnit[] = [];
    for (const unit of units) {
      if (issuedUnitIds.has(unit.id)) continue;
      const total = unit.lessons.length;
      if (total === 0) continue;
      const completed = unit.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progress = Math.round((completed / total) * 100);
      if (progress >= threshold) {
        eligible.push({
          unitId: unit.id,
          title: unit.title,
          displayOrder: unit.displayOrder,
          progress,
          gradeLabel: gradeLabelFromPercent(progress),
          stageName: unit.grade.stage.name,
          gradeName: unit.grade.name,
          termName: unit.term?.name ?? null,
          academicYearName: unit.academicYear?.name ?? null,
          courseName: unit.book?.title ?? "English Language",
        });
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

    const verificationCode = dto.verificationCode?.trim() ?? generateVerificationCode();

    return this.prisma.unitCertificate.create({
      data: {
        userId,
        unitId,
        fileName: dto.fileName,
        fileUrl,
        fileSize: buffer.length,
        mimeType: dto.mimeType ?? "application/pdf",
        verificationCode,
      },
      include: {
        unit: { select: { id: true, title: true, displayOrder: true } },
      },
    });
  }

  /**
   * Public lookup used by the QR verification page. Returns only non-sensitive
   * certificate details and never the stored PDF itself.
   */
  async verifyByCode(verificationCode: string): Promise<unknown> {
    const cert = await this.prisma.unitCertificate.findUnique({
      where: { verificationCode },
      select: {
        id: true,
        verificationCode: true,
        earnedAt: true,
        user: { select: { fullName: true, englishName: true } },
        unit: { select: { title: true, displayOrder: true } },
      },
    });
    if (!cert) throw new NotFoundException("Certificate not found");

    const englishName = cert.user.englishName?.trim() ?? "";
    return {
      verified: true,
      id: cert.id,
      verificationCode: cert.verificationCode,
      studentName: englishName.length > 0 ? englishName : cert.user.fullName,
      unitTitle: cert.unit.title,
      unitNumber: cert.unit.displayOrder,
      earnedAt: cert.earnedAt,
    };
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
