import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
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
          orderBy: { displayOrder: "asc" },
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

    return {
      ...lesson,
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
      data: { lessonId, title: youtubeUrl, youtubeUrl, youtubeId, displayOrder: 0 },
    });
  }

  async deleteVideo(lessonId: string, videoId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const video = await this.prisma.lessonVideo.findFirst({ where: { id: videoId, lessonId } });
    if (!video) throw new NotFoundException("Video not found");
    await this.prisma.lessonVideo.delete({ where: { id: videoId } });
  }

  async addVocabulary(lessonId: string, word: string, translation: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.prisma.lessonVocabulary.create({
      data: { lessonId, word, translation, displayOrder: 0 },
    });
  }

  async deleteVocabulary(lessonId: string, vocabId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.lessonVocabulary.delete({ where: { id: vocabId } });
  }

  async uploadDocument(lessonId: string, fileName: string, fileUrl: string, fileSize: number, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    return this.prisma.lessonDocument.upsert({
      where: { lessonId },
      create: { lessonId, fileName, fileUrl, fileSize },
      update: { fileName, fileUrl, fileSize },
    });
  }

  async deleteDocument(lessonId: string, userId: string): Promise<void> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    await this.prisma.lessonDocument.deleteMany({ where: { lessonId } });
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
