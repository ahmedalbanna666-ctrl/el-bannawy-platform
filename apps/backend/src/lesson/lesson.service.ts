import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

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

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    });

    return {
      ...lesson,
      progress: progress ?? { progress: 0, completed: false },
    };
  }

  async getLessonVideos(lessonId: string): Promise<unknown[]> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

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

  async getLessonVocabulary(lessonId: string): Promise<unknown[]> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    return this.prisma.lessonVocabulary.findMany({
      where: { lessonId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getLessonHomework(lessonId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.homeworkEnabled) return null;

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

  async getLessonQuiz(lessonId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.quizEnabled) return null;

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
}
