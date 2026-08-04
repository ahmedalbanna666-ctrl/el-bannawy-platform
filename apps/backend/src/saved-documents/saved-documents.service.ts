import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FILE_STORAGE, type FileStorage } from "../common/storage/file-storage";

@Injectable()
export class SavedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
  ) {}

  async save(userId: string, lessonId: string): Promise<unknown> {
    const doc = await this.prisma.lessonDocument.findUnique({ where: { lessonId } });
    if (!doc) throw new NotFoundException("Document not found for this lesson");
    if (!doc.downloadable) {
      throw new ForbiddenException("This document is not available for saving");
    }

    const existing = await this.prisma.savedDocument.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) throw new ConflictException("Document already saved");

    const buffer = await this.fileStorage.read(doc.fileUrl).catch(() => {
      throw new NotFoundException("Source file not found");
    });

    const { fileUrl } = await this.fileStorage.save(buffer, doc.fileName, `${userId}-${lessonId}`, "saved-documents");

    return this.prisma.savedDocument.create({
      data: {
        userId,
        lessonId,
        fileName: doc.fileName,
        fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
      },
      include: { lesson: { select: { title: true } } },
    });
  }

  async findAll(userId: string): Promise<unknown[]> {
    return this.prisma.savedDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { lesson: { select: { title: true } } },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const saved = await this.prisma.savedDocument.findFirst({ where: { id, userId } });
    if (!saved) throw new NotFoundException("Saved document not found");

    await this.fileStorage.remove(saved.fileUrl);

    await this.prisma.savedDocument.delete({ where: { id } });
  }

  async getFile(userId: string, id: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const saved = await this.prisma.savedDocument.findFirst({ where: { id, userId } });
    if (!saved) throw new NotFoundException("Saved document not found");

    const buffer = await this.fileStorage.read(saved.fileUrl).catch(() => {
      throw new NotFoundException("File not found");
    });

    return { buffer, fileName: saved.fileName, mimeType: saved.mimeType };
  }
}
