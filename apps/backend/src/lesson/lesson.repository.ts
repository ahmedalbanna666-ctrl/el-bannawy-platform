import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.lesson.findUnique({ where: { id } });
  }

  async findByIdWithFullContent(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { displayOrder: "asc" },
          where: { enabled: true },
          include: {
            timelineEvents: { where: { required: true }, orderBy: { timestamp: "asc" } },
            activities: { orderBy: { displayOrder: "asc" } },
          },
        },
        vocabulary: { where: { sectionId: null }, orderBy: { displayOrder: "asc" } },
        vocabularySections: { orderBy: { displayOrder: "asc" }, include: { vocabularyItems: { orderBy: { displayOrder: "asc" } }, relations: { orderBy: { displayOrder: "asc" } } } },
        settings: true,
        document: true,
        unit: { select: { id: true, title: true, displayOrder: true, grade: { select: { id: true, name: true } } } },
      },
    });
  }

  async findVideos(lessonId: string) {
    return this.prisma.lessonVideo.findMany({
      where: { lessonId, enabled: true },
      orderBy: { displayOrder: "asc" },
      include: {
        timelineEvents: { where: { required: true }, orderBy: { timestamp: "asc" } },
        activities: { orderBy: { displayOrder: "asc" }, include: { questions: { select: { id: true, question: true, options: true, displayOrder: true } } } },
      },
    });
  }

  async findVocabulary(lessonId: string) {
    return this.prisma.lessonVocabulary.findMany({
      where: { lessonId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async findHomework(lessonId: string) {
    return this.prisma.homework.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { displayOrder: "asc" } } },
    });
  }

  async findQuiz(lessonId: string) {
    return this.prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { displayOrder: "asc" } } },
    });
  }

  async findUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findLessonProgress(userId: string, lessonId: string) {
    return this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }

  async findVideo(lessonId: string, videoId: string) {
    return this.prisma.lessonVideo.findFirst({ where: { id: videoId, lessonId } });
  }

  async createVideo(data: {
    lessonId: string;
    title: string;
    youtubeUrl: string;
    youtubeId: string;
    providerVideoId: string;
    providerUrl: string;
    displayOrder: number;
  }) {
    return this.prisma.lessonVideo.create({ data });
  }

  async countVideos(lessonId: string) {
    return this.prisma.lessonVideo.count({ where: { lessonId } });
  }

  async deleteVideo(videoId: string) {
    return this.prisma.lessonVideo.delete({ where: { id: videoId } });
  }

  async upsertLessonProgress(userId: string, lessonId: string, data: { progress: number; completed: boolean; completedAt?: Date }) {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: data,
      create: { userId, lessonId, ...data },
    });
  }

  async findDocument(lessonId: string) {
    return this.prisma.lessonDocument.findUnique({ where: { lessonId } });
  }

  async upsertDocument(lessonId: string, data: { fileName: string; fileUrl: string; mimeType: string; fileSize: number; downloadable: boolean }) {
    return this.prisma.lessonDocument.upsert({
      where: { lessonId },
      update: data,
      create: { lessonId, ...data },
    });
  }

  async deleteDocument(lessonId: string) {
    return this.prisma.lessonDocument.delete({ where: { lessonId } });
  }

  async updateDocument(lessonId: string, data: { downloadable?: boolean }) {
    return this.prisma.lessonDocument.update({ where: { lessonId }, data });
  }

  async findUserSessions(userId: string) {
    return this.prisma.session.findMany({ where: { userId } });
  }

  $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
