import * as fs from "fs/promises";
import * as path from "path";
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";

const CERTIFICATE_ROOT = path.resolve(process.cwd(), "uploads", "certificates");
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

    const userDir = path.join(CERTIFICATE_ROOT, userId);
    await fs.mkdir(userDir, { recursive: true });
    const storedName = `${unitId}.pdf`;
    await fs.writeFile(path.join(userDir, storedName), buffer);

    const fileUrl = `/files/certificates/${userId}/${storedName}`;

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

    const targetPath = path.resolve(CERTIFICATE_ROOT, userId, path.basename(cert.fileUrl));
    const buffer = await fs.readFile(targetPath).catch(() => {
      throw new NotFoundException("File not found on disk");
    });

    return { buffer, fileName: cert.fileName, mimeType: cert.mimeType };
  }
}
