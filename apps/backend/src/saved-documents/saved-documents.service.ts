import * as fs from "fs/promises";
import * as path from "path";
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SAVED_ROOT = path.resolve(process.cwd(), "uploads", "saved-documents");

@Injectable()
export class SavedDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const sourcePath = path.resolve(process.cwd(), "uploads", "documents", path.basename(doc.fileUrl));
    const userDir = path.join(SAVED_ROOT, userId);
    await fs.mkdir(userDir, { recursive: true });

    const ext = path.extname(doc.fileName).toLowerCase();
    const storedName = `${lessonId}${ext}`;
    const targetPath = path.join(userDir, storedName);

    try {
      await fs.copyFile(sourcePath, targetPath);
    } catch {
      throw new NotFoundException("Source file not found on disk");
    }

    const fileUrl = `/files/saved-documents/${userId}/${storedName}`;

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

    const targetPath = path.resolve(SAVED_ROOT, userId, path.basename(saved.fileUrl));
    try {
      await fs.unlink(targetPath);
    } catch {
      // file already missing — ok
    }

    await this.prisma.savedDocument.delete({ where: { id } });
  }

  async getFile(userId: string, id: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const saved = await this.prisma.savedDocument.findFirst({ where: { id, userId } });
    if (!saved) throw new NotFoundException("Saved document not found");

    const targetPath = path.resolve(SAVED_ROOT, userId, path.basename(saved.fileUrl));
    const buffer = await fs.readFile(targetPath).catch(() => {
      throw new NotFoundException("File not found on disk");
    });

    return { buffer, fileName: saved.fileName, mimeType: saved.mimeType };
  }
}
