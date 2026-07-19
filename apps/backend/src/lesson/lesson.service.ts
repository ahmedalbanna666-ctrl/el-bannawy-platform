import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import * as fs from "fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { VocabularyPreviewService } from "../document-import/services/vocabulary-preview.service";
import { LocalFileStorage } from "../common/storage/local-file.storage";
import type { VocabularyStructuredDraft } from "../document-import/types/vocabulary-structured.types";

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly vocabularyPreview: VocabularyPreviewService,
    private readonly fileStorage: LocalFileStorage,
  ) {}

  async getLesson(id: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { displayOrder: "asc" },
          where: { enabled: true },
          include: {
            timelineEvents: {
              orderBy: { timestamp: "asc" },
              where: { required: true },
            },
            activities: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        vocabulary: {
          where: { sectionId: null },
          orderBy: { displayOrder: "asc" },
        },
        vocabularySections: {
          orderBy: { displayOrder: "asc" },
          include: {
            vocabularyItems: {
              orderBy: { displayOrder: "asc" },
            },
            relations: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        settings: true,
        document: true,
        unit: {
          select: {
            id: true,
            title: true,
            grade: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    await this.academicContext.verifyStudentLessonAccess(userId, id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "TEACHER") {
      await this.academicContext.verifyTeacherLessonAccess(userId, id);
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    });

    const groups = lesson.vocabularySections.map((section) => ({
      id: section.id,
      kind: section.kind,
      title: section.title,
      displayOrder: section.displayOrder,
      items: section.vocabularyItems,
    }));

    return {
      ...lesson,
      vocabulary: { groups },
      progress: progress ?? { progress: 0, completed: false },
    };
  }

  async getLessonVideos(lessonId: string, userId: string): Promise<unknown[]> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "TEACHER") {
      await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    }

    return this.prisma.lessonVideo.findMany({
      where: { lessonId, enabled: true },
      orderBy: { displayOrder: "asc" },
      include: {
        timelineEvents: {
          orderBy: { timestamp: "asc" },
        },
        activities: {
          orderBy: { displayOrder: "asc" },
          include: {
            questions: true,
          },
        },
      },
    });
  }

  async getLessonVocabulary(lessonId: string, userId: string): Promise<unknown[]> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "TEACHER") {
      await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    }

    return this.prisma.lessonVocabulary.findMany({
      where: { lessonId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getLessonHomework(lessonId: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.homeworkEnabled) return null;

    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "TEACHER") {
      await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    }

    const homework = await this.prisma.homework.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            question: true,
            options: true,
            displayOrder: true,
          },
        },
      },
    });

    return homework;
  }

  async getLessonQuiz(lessonId: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.quizEnabled) return null;

    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "TEACHER") {
      await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            question: true,
            options: true,
            displayOrder: true,
          },
        },
      },
    });

    return quiz;
  }

  // ── Management Methods ─────────────────────────────────────────────

  async addVideo(lessonId: string, youtubeUrl: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const youtubeId = this.extractYoutubeId(youtubeUrl);
    if (!youtubeId) throw new BadRequestException("Invalid YouTube URL");

    return this.prisma.lessonVideo.create({
      data: { lessonId, title: youtubeUrl, youtubeUrl, youtubeId, providerVideoId: youtubeId, providerUrl: youtubeUrl, displayOrder: 0 },
    });
  }

  async deleteVideo(lessonId: string, videoId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const video = await this.prisma.lessonVideo.findFirst({ where: { id: videoId, lessonId } });
    if (!video) throw new NotFoundException("Video not found");
    await this.prisma.lessonVideo.delete({ where: { id: videoId } });
  }

  async addVocabulary(lessonId: string, dto: { word: string; translation: string; definition?: string; example?: string; partOfSpeech?: string }, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const defTrimmed = dto.definition?.trim();
    const exTrimmed = dto.example?.trim();
    const posTrimmed = dto.partOfSpeech?.trim();
    return this.prisma.lessonVocabulary.create({
      data: {
        lessonId,
        word: dto.word.trim(),
        translation: dto.translation.trim(),
        definition: defTrimmed !== undefined && defTrimmed.length > 0 ? defTrimmed : null,
        example: exTrimmed !== undefined && exTrimmed.length > 0 ? exTrimmed : null,
        partOfSpeech: posTrimmed !== undefined && posTrimmed.length > 0 ? posTrimmed : null,
        displayOrder: 0,
      },
    });
  }

  async updateVocabulary(lessonId: string, vocabId: string, dto: { word?: string; translation?: string; definition?: string; example?: string; partOfSpeech?: string }, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const existing = await this.prisma.lessonVocabulary.findFirst({
      where: { id: vocabId, lessonId },
    });
    if (!existing) {
      throw new NotFoundException("Vocabulary item not found");
    }

    const data: Record<string, string | null> = {};
    if (dto.word !== undefined) data.word = dto.word.trim();
    if (dto.translation !== undefined) data.translation = dto.translation.trim();
    if (dto.definition !== undefined) {
      const trimmed = dto.definition.trim();
      data.definition = trimmed.length > 0 ? trimmed : null;
    }
    if (dto.example !== undefined) {
      const trimmed = dto.example.trim();
      data.example = trimmed.length > 0 ? trimmed : null;
    }
    if (dto.partOfSpeech !== undefined) {
      const trimmed = dto.partOfSpeech.trim();
      data.partOfSpeech = trimmed.length > 0 ? trimmed : null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No fields provided for update");
    }

    return this.prisma.lessonVocabulary.update({
      where: { id: vocabId },
      data,
    });
  }

  async deleteVocabulary(lessonId: string, vocabId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const existing = await this.prisma.lessonVocabulary.findFirst({
      where: { id: vocabId, lessonId },
    });
    if (!existing) {
      throw new NotFoundException("Vocabulary item not found");
    }

    await this.prisma.lessonVocabulary.delete({ where: { id: vocabId } });
  }

  async deleteAllVocabulary(lessonId: string, userId: string): Promise<{ deletedCount: number }> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const result = await this.prisma.lessonVocabulary.deleteMany({
      where: { lessonId },
    });

    return { deletedCount: result.count };
  }

  async previewVocabularyImport(lessonId: string, buffer: Buffer, originalName: string, userId: string): Promise<VocabularyStructuredDraft> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.vocabularyPreview.preview(buffer, originalName);
  }

  async commitVocabularyImport(
    lessonId: string,
    dto: {
      items: Array<{
        word: string;
        translation: string;
        definition?: string;
        example?: string;
        displayOrder?: number;
        replaceVocabId?: string;
        partOfSpeech?: string;
        kind?: string;
        synonym?: string;
        synonymTranslation?: string;
        antonym?: string;
        antonymTranslation?: string;
        sectionClientDraftId?: string;
      }>;
      sections?: Array<{ clientDraftId?: string; title?: string; displayOrder?: number; kind?: string }>;
      removeVocabIds?: string[];
    },
    userId: string,
  ): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.removeVocabIds && dto.removeVocabIds.length > 0) {
        await tx.lessonVocabulary.deleteMany({
          where: { id: { in: dto.removeVocabIds }, lessonId },
        });
      }

      const clientDraftToSectionId = new Map<string, string>();
      const sections = dto.sections ?? [];
      for (let s = 0; s < sections.length; s++) {
        const section = sections[s];
        const created = await tx.vocabularySection.create({
          data: {
            lessonId,
            kind: (section.kind as "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM") ?? "STANDARD_VOCABULARY",
            title: section.title?.trim() || null,
            displayOrder: section.displayOrder ?? s,
          },
        });
        if (section.clientDraftId) {
          clientDraftToSectionId.set(section.clientDraftId, created.id);
        }
      }

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        if (item.replaceVocabId) {
          await tx.lessonVocabulary.delete({
            where: { id: item.replaceVocabId },
          });
        }

        const sectionId = item.sectionClientDraftId
          ? clientDraftToSectionId.get(item.sectionClientDraftId) ?? null
          : null;

        if (item.kind === "SYNONYM_ANTONYM_RELATION") {
          await tx.vocabularyRelation.create({
            data: {
              lessonId,
              sectionId: sectionId ?? "",
              primaryWord: item.word.trim(),
              primaryTranslation: item.translation.trim(),
              synonym: item.synonym?.trim() || null,
              synonymTranslation: item.synonymTranslation?.trim() || null,
              antonym: item.antonym?.trim() || null,
              antonymTranslation: item.antonymTranslation?.trim() || null,
              displayOrder: item.displayOrder ?? i,
            },
          });
        } else {
          await tx.lessonVocabulary.create({
            data: {
              lessonId,
              sectionId,
              word: item.word.trim(),
              translation: item.translation.trim(),
              definition: item.definition?.trim() || null,
              example: item.example?.trim() || null,
              partOfSpeech: item.partOfSpeech?.trim() || null,
              displayOrder: item.displayOrder ?? i,
            },
          });
        }
      }

      const [vocabulary, relations, createdSections] = await Promise.all([
        tx.lessonVocabulary.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
        tx.vocabularyRelation.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
        tx.vocabularySection.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
      ]);

      return { vocabulary, relations, sections: createdSections };
    });
  }

  async uploadDocument(
    lessonId: string,
    fileName: string,
    buffer: Buffer,
    fileSize: number,
    mimeType: string,
    userId: string,
  ): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const existing = await this.prisma.lessonDocument.findUnique({ where: { lessonId } });
    if (existing?.fileUrl) {
      await this.fileStorage.remove(existing.fileUrl);
    }

    const { fileUrl } = await this.fileStorage.save(buffer, fileName, lessonId);

    return this.prisma.lessonDocument.upsert({
      where: { lessonId },
      create: { lessonId, fileName, fileUrl, fileSize, mimeType, downloadable: true },
      update: { fileName, fileUrl, fileSize, mimeType },
    });
  }

  async deleteDocument(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const existing = await this.prisma.lessonDocument.findUnique({ where: { lessonId } });
    if (existing?.fileUrl) {
      await this.fileStorage.remove(existing.fileUrl);
    }
    await this.prisma.lessonDocument.deleteMany({ where: { lessonId } });
  }

  async getDocument(lessonId: string, userId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const doc = await this.prisma.lessonDocument.findUnique({ where: { lessonId } });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    const role = await this.getRole(userId);
    if (role !== "TEACHER" && role !== "ADMINISTRATOR" && !doc.downloadable) {
      throw new ForbiddenException("This document is not available for download");
    }
    if (role === "STUDENT") {
      await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    }

    const exists = await this.fileStorage.exists(doc.fileUrl);
    if (!exists) {
      throw new NotFoundException("Document file is missing");
    }

    const buffer = await fs.readFile(this.fileStorage.resolve(doc.fileUrl));
    return { buffer, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async setDocumentDownloadable(lessonId: string, downloadable: boolean, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.prisma.lessonDocument.upsert({
      where: { lessonId },
      create: { lessonId, fileName: "document", fileUrl: "", downloadable },
      update: { downloadable },
    });
  }

  private async getRole(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role ?? "STUDENT";
  }

  async uploadQuiz(lessonId: string, title: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.prisma.quiz.upsert({
      where: { lessonId },
      create: { lessonId, title },
      update: { title },
    });
  }

  async deleteQuiz(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.quiz.deleteMany({ where: { lessonId } });
  }

  async uploadHomework(lessonId: string, title: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.prisma.homework.upsert({
      where: { lessonId },
      create: { lessonId, title },
      update: { title },
    });
  }

  async deleteHomework(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.homework.deleteMany({ where: { lessonId } });
  }

  private extractYoutubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
  }
}
