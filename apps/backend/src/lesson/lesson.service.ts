import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { LessonRepository } from "./lesson.repository";
import type { UpdateLessonVideoDto } from "./dto/video.dto";
import { VocabularyPreviewService } from "../document-import/services/vocabulary-preview.service";
import { QuestionPreviewService } from "../document-import/services/question-preview.service";
import { QuestionPersistenceService } from "../document-import/services/question-persistence.service";
import { FILE_STORAGE, type FileStorage } from "../common/storage/file-storage";
import type { VocabularyStructuredDraft } from "../document-import/types/vocabulary-structured.types";
import type { QuestionImportPreview, QuestionPreviewType } from "../document-import/types/question-preview.types";
import type { QuestionStructuredDraft, QuestionPersistenceResult } from "../document-import/types/question-structured.types";

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly lessonRepo: LessonRepository,
    private readonly vocabularyPreview: VocabularyPreviewService,
    private readonly questionPreview: QuestionPreviewService,
    private readonly questionPersistence: QuestionPersistenceService,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
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
    await this.assertStudentPaymentAccess(userId, id);

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

    const groups = [
      ...(lesson.vocabulary.length > 0
        ? [
            {
              id: null as string | null,
              title: null as string | null,
              displayOrder: 0,
              items: lesson.vocabulary,
            },
          ]
        : []),
      ...lesson.vocabularySections.map((section) => ({
        id: section.id,
        kind: section.kind,
        title: section.title,
        displayOrder: section.displayOrder,
        items: section.vocabularyItems,
      })),
    ];

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
    await this.assertStudentPaymentAccess(userId, lessonId);

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
    await this.assertStudentPaymentAccess(userId, lessonId);

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
    await this.assertStudentPaymentAccess(userId, lessonId);

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
    await this.assertStudentPaymentAccess(userId, lessonId);

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

    const [title, duration] = await Promise.all([
      this.fetchVideoTitle(youtubeId),
      this.fetchVideoDuration(youtubeId),
    ]);
    const displayOrder = await this.prisma.lessonVideo.count({ where: { lessonId } });

    await this.prisma.lessonVideo.create({
      data: { lessonId, title, youtubeUrl, youtubeId, providerVideoId: youtubeId, providerUrl: youtubeUrl, displayOrder, duration },
    });

    await this.recalculateLessonDuration(lessonId);
    return this.prisma.lessonVideo.findFirst({ where: { lessonId }, orderBy: { displayOrder: "desc" } });
  }

  async updateVideo(lessonId: string, videoId: string, dto: UpdateLessonVideoDto, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const existing = await this.prisma.lessonVideo.findFirst({ where: { id: videoId, lessonId } });
    if (!existing) throw new NotFoundException("Video not found");

    await this.prisma.lessonVideo.update({
      where: { id: videoId },
      data: { showThumbnail: dto.showThumbnail },
    });

    return this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
  }

  private async fetchVideoTitle(youtubeId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
      );
      if (!response.ok) return youtubeId;
      const data = (await response.json()) as { title?: string };
      return data.title?.trim() ?? youtubeId;
    } catch {
      return youtubeId;
    }
  }

  private async fetchVideoDuration(youtubeId: string): Promise<number> {
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (!response.ok) return 0;
      const html = await response.text();
      const match = /"lengthSeconds":"?(\d+)"?/.exec(html);
      if (!match) return 0;
      const seconds = Number.parseInt(match[1], 10);
      return Number.isFinite(seconds) ? seconds : 0;
    } catch {
      return 0;
    }
  }

  private async recalculateLessonDuration(lessonId: string): Promise<void> {
    const agg = await this.prisma.lessonVideo.aggregate({
      where: { lessonId, enabled: true },
      _sum: { duration: true },
    });
    const totalSeconds = agg._sum.duration ?? 0;
    const totalMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { estimatedDuration: totalMinutes },
    });
  }

  async deleteVideo(lessonId: string, videoId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const video = await this.prisma.lessonVideo.findFirst({ where: { id: videoId, lessonId } });
    if (!video) throw new NotFoundException("Video not found");
    await this.prisma.lessonVideo.delete({ where: { id: videoId } });
    await this.recalculateLessonDuration(lessonId);
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
      items: {
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
      }[];
      sections?: { clientDraftId?: string; title?: string; displayOrder?: number; kind?: string }[];
      removeVocabIds?: string[];
    },
    userId: string,
  ): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    return this.prisma.$transaction(async (tx) => {
      // The import preview is the source of truth: replace all existing
      // vocabulary content (flat items, relations and sections) with the
      // committed preview so re-imports never accumulate stale sections.
      await tx.lessonVocabulary.deleteMany({ where: { lessonId } });
      await tx.vocabularyRelation.deleteMany({ where: { lessonId } });
      await tx.vocabularySection.deleteMany({ where: { lessonId } });

      const clientDraftToSectionId = new Map<string, string>();
      const sections = dto.sections ?? [];
      for (let s = 0; s < sections.length; s++) {
        const section = sections[s];
        const created = await tx.vocabularySection.create({
          data: {
            lessonId,
            kind: (section.kind ?? "STANDARD_VOCABULARY") as "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM",
            title: section.title?.trim() || null,
            displayOrder: section.displayOrder ?? s,
          },
        });
        if (section.clientDraftId) {
          clientDraftToSectionId.set(section.clientDraftId, created.id);
        }
      }

      const vocabularyData: {
        lessonId: string;
        sectionId: string | null;
        word: string;
        translation: string;
        definition: string | null;
        example: string | null;
        partOfSpeech: string | null;
        displayOrder: number;
      }[] = [];
      const relationData: {
        lessonId: string;
        sectionId: string;
        primaryWord: string;
        primaryTranslation: string;
        synonym: string | null;
        synonymTranslation: string | null;
        antonym: string | null;
        antonymTranslation: string | null;
        displayOrder: number;
      }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];

        const sectionId = item.sectionClientDraftId
          ? clientDraftToSectionId.get(item.sectionClientDraftId) ?? null
          : null;

        if (item.kind === "SYNONYM_ANTONYM_RELATION") {
          relationData.push({
            lessonId,
            sectionId: sectionId ?? "",
            primaryWord: item.word.trim(),
            primaryTranslation: item.translation.trim(),
            synonym: item.synonym?.trim() || null,
            synonymTranslation: item.synonymTranslation?.trim() || null,
            antonym: item.antonym?.trim() || null,
            antonymTranslation: item.antonymTranslation?.trim() || null,
            displayOrder: item.displayOrder ?? i,
          });
        } else {
          vocabularyData.push({
            lessonId,
            sectionId,
            word: item.word.trim(),
            translation: item.translation.trim(),
            definition: item.definition?.trim() || null,
            example: item.example?.trim() || null,
            partOfSpeech: item.partOfSpeech?.trim() || null,
            displayOrder: item.displayOrder ?? i,
          });
        }
      }

      if (relationData.length > 0) {
        await tx.vocabularyRelation.createMany({ data: relationData });
      }
      if (vocabularyData.length > 0) {
        await tx.lessonVocabulary.createMany({ data: vocabularyData });
      }

      const [vocabulary, relations, createdSections] = await Promise.all([
        tx.lessonVocabulary.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
        tx.vocabularyRelation.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
        tx.vocabularySection.findMany({ where: { lessonId }, orderBy: { displayOrder: "asc" } }),
      ]);

      return { vocabulary, relations, sections: createdSections };
    });
  }

  async previewQuestionImport(lessonId: string, buffer: Buffer, originalName: string, userId: string): Promise<QuestionImportPreview> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.questionPreview.preview(buffer, originalName);
  }

  async commitQuestionImport(
    lessonId: string,
    dto: QuestionStructuredDraft,
    userId: string,
  ): Promise<QuestionPersistenceResult> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    return this.questionPersistence.persistQuestions(lessonId, dto);
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
      await this.assertStudentPaymentAccess(userId, lessonId);
    }

    const exists = await this.fileStorage.exists(doc.fileUrl);
    if (!exists) {
      throw new NotFoundException("Document file is missing");
    }

    const buffer = await this.fileStorage.read(doc.fileUrl);
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

  private async assertStudentPaymentAccess(userId: string, lessonId: string): Promise<void> {
    const role = await this.getRole(userId);
    if (role !== "STUDENT") return;
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isPremium: true,
        lockedOverride: true,
        unit: { select: { id: true, isPremium: true, lockedOverride: true, termId: true } },
      },
    });
    if (!lesson) return;
    if (lesson.lockedOverride === true || lesson.unit.lockedOverride === true) {
      throw new ForbiddenException("This lesson is locked");
    }
    if (lesson.lockedOverride === false) return;
    const needsPurchase = lesson.isPremium || (lesson.unit.isPremium && lesson.unit.lockedOverride !== false);
    if (!needsPurchase) return;
    const owned = await this.prisma.contentUnlock.findFirst({
      where: {
        userId,
        OR: [
          { targetType: "UNIT", targetId: lesson.unit.id },
          ...(lesson.unit.termId ? [{ targetType: "TERM", targetId: lesson.unit.termId }] : []),
        ],
      },
      select: { id: true },
    });
    if (!owned) {
      throw new ForbiddenException("This lesson requires purchasing its unit or term");
    }
  }

  async uploadQuiz(lessonId: string, title: string, buffer: Buffer, fileSize: number, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { title: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    const quizTitle = `${lesson.title} ( Test )`;

    const preview = await this.questionPreview.preview(buffer, title);
    const quiz = await this.prisma.quiz.upsert({
      where: { lessonId },
      create: { lessonId, title: quizTitle },
      update: { title: quizTitle },
    });

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { quizEnabled: true },
    });

    await this.prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });

    const quizQuestionData: Record<string, unknown>[] = [];
    let displayOrder = 0;
    for (const group of preview.groups) {
      for (const item of group.items) {
        if (item.status === "INVALID") continue;
        const mappedType = this.mapQuestionType(item.questionType);
        const isDialogue = mappedType === "DIALOGUE";
        quizQuestionData.push({
          quizId: quiz.id,
          type: mappedType,
          question: item.prompt,
          options: isDialogue
            ? (item.options[0]?.text ?? null)
            : (item.options.length > 0 ? JSON.stringify(item.options.map((o) => ({ label: o.label, text: o.text }))) : null),
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          correctionMode: isDialogue ? "AI" : undefined,
          displayOrder,
        });
        displayOrder++;
      }
    }

    if (quizQuestionData.length > 0) {
      await this.prisma.quizQuestion.createMany({ data: quizQuestionData as never });
    }

    return this.prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: { _count: { select: { questions: true } } },
    });
  }

  async deleteQuiz(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.quiz.deleteMany({ where: { lessonId } });
  }

  async uploadHomework(lessonId: string, title: string, buffer: Buffer, fileSize: number, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { title: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    const homeworkTitle = `${lesson.title} ( Homework )`;

    const preview = await this.questionPreview.preview(buffer, title);
    const homework = await this.prisma.homework.upsert({
      where: { lessonId },
      create: { lessonId, title: homeworkTitle },
      update: { title: homeworkTitle },
    });

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { homeworkEnabled: true },
    });

    await this.prisma.homeworkQuestion.deleteMany({ where: { homeworkId: homework.id } });

    const homeworkQuestionData: Record<string, unknown>[] = [];
    let displayOrder = 0;
    for (const group of preview.groups) {
      for (const item of group.items) {
        if (item.status === "INVALID") continue;
        const mappedType = this.mapQuestionType(item.questionType);
        const isDialogue = mappedType === "DIALOGUE";
        homeworkQuestionData.push({
          homeworkId: homework.id,
          type: mappedType,
          question: item.prompt,
          options: isDialogue
            ? (item.options[0]?.text ?? null)
            : (item.options.length > 0 ? JSON.stringify(item.options.map((o) => ({ label: o.label, text: o.text }))) : null),
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          correctionMode: isDialogue ? "AI" : undefined,
          displayOrder,
        });
        displayOrder++;
      }
    }

    if (homeworkQuestionData.length > 0) {
      await this.prisma.homeworkQuestion.createMany({ data: homeworkQuestionData as never });
    }

    return this.prisma.homework.findUnique({
      where: { id: homework.id },
      include: { _count: { select: { questions: true } } },
    });
  }

  async deleteHomework(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.homework.deleteMany({ where: { lessonId } });
  }

  private mapQuestionType(type: QuestionPreviewType): string {
    const mapping: Record<string, string> = {
      MCQ: "MULTIPLE_CHOICE",
      TRUE_FALSE: "TRUE_FALSE",
      FILL_IN_BLANK: "FILL_IN_BLANK",
      GRAMMAR: "GRAMMAR",
      SHORT_ANSWER: "SHORT_ANSWER",
      ESSAY: "ESSAY",
      MATCHING: "MATCHING",
      ORDERING: "ORDERING",
      DRAG_DROP: "DRAG_DROP",
      DIALOGUE: "DIALOGUE",
      DIALOGUE_QUESTION: "DIALOGUE",
    };
    return mapping[type] ?? "MULTIPLE_CHOICE";
  }

  async getLessonGames(lessonId: string, _userId: string): Promise<Record<string, { enabled: boolean }>> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    const settings = await this.prisma.lessonSettings.findUnique({
      where: { lessonId },
      select: { games: true },
    });

    if (settings?.games) {
      try { return JSON.parse(settings.games) as Record<string, { enabled: boolean }>; }
      catch { return {}; }
    }
    return {};
  }

  async updateLessonGames(lessonId: string, games: Record<string, { enabled: boolean }>, userId: string): Promise<Record<string, { enabled: boolean }>> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, unit: { select: { gradeId: true } } } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, lesson.unit.gradeId);

    const gamesJson = JSON.stringify(games);
    await this.prisma.lessonSettings.upsert({
      where: { lessonId },
      create: { lessonId, games: gamesJson },
      update: { games: gamesJson },
    });

    return games;
  }

  private extractYoutubeId(url: string): string | null {
    const match = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
    return match?.[1] ?? null;
  }
}
