import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateHomeworkDto } from "./dto/create-homework.dto";
import type { UpdateHomeworkDto } from "./dto/update-homework.dto";
import type { SaveAnswerDto } from "./dto/save-homework.dto";

interface HomeworkSummary {
  id: string;
  lessonId: string;
  title: string;
  instructions: string | null;
  passingScore: number;
  maxAttempts: number;
  xpReward: number;
  published: boolean;
  allowRetry: boolean;
  showAnswers: boolean;
  _count: { questions: number };
}

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomework(lessonId: string): Promise<HomeworkSummary | null> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.homeworkEnabled) return null;

    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
      select: {
        id: true,
        lessonId: true,
        title: true,
        instructions: true,
        passingScore: true,
        maxAttempts: true,
        xpReward: true,
        published: true,
        allowRetry: true,
        showAnswers: true,
        _count: { select: { questions: true } },
      },
    });

    if (!homework) throw new NotFoundException("Homework not found");
    return homework;
  }

  async getQuestions(lessonId: string): Promise<unknown> {
    const homework = await this.getHomework(lessonId);
    if (!homework) throw new NotFoundException("Homework not found");

    const questions = await this.prisma.homeworkQuestion.findMany({
      where: { homeworkId: homework.id },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        type: true,
        question: true,
        options: true,
        displayOrder: true,
      },
    });

    return { questions };
  }

  async startAttempt(lessonId: string, userId: string): Promise<unknown> {
    const homework = await this.getHomework(lessonId);
    if (!homework) throw new NotFoundException("Homework not found");

    const totalAttempts = await this.prisma.studentHomeworkAttempt.count({
      where: { userId, homeworkId: homework.id },
    });

    if (totalAttempts >= homework.maxAttempts) {
      throw new ForbiddenException("Maximum attempts reached");
    }

    const attempt = await this.prisma.studentHomeworkAttempt.create({
      data: {
        userId,
        homeworkId: homework.id,
        attemptNum: totalAttempts + 1,
        startedAt: new Date(),
      },
      select: {
        id: true,
        attemptNum: true,
        startedAt: true,
      },
    });

    return attempt;
  }

  async submitHomework(
    lessonId: string,
    userId: string,
    answers: string[],
    _response?: string,
  ): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
      include: {
        questions: { orderBy: { displayOrder: "asc" } },
      },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const latestAttempt = await this.prisma.studentHomeworkAttempt.findFirst({
      where: { userId, homeworkId: homework.id, submitted: false },
      orderBy: { attemptNum: "desc" },
    });

    if (!latestAttempt) throw new ForbiddenException("No active attempt found. Start a new attempt first.");

    const correctAnswers: string[] = [];
    const wrongAnswersList: { questionId: string; studentAnswer: string; correctAnswer: string }[] = [];

    // Auto-grade and record individual answers
    const homeworkAnswerRecords: { attemptId: string; questionId: string; answer: string; isCorrect: boolean }[] = [];

    for (let i = 0; i < homework.questions.length; i++) {
      const question = homework.questions[i];
      const studentAnswer = i < answers.length ? answers[i].trim().toLowerCase() : "";
      const correct = (question.correctAnswer ?? "").trim().toLowerCase();
      const isCorrect = studentAnswer === correct;

      homeworkAnswerRecords.push({
        attemptId: latestAttempt.id,
        questionId: question.id,
        answer: studentAnswer,
        isCorrect,
      });

      if (isCorrect) {
        correctAnswers.push(question.id);
      } else {
        wrongAnswersList.push({
          questionId: question.id,
          studentAnswer,
          correctAnswer: correct,
        });
      }
    }

    const score = homework.questions.length > 0
      ? Math.round((correctAnswers.length / homework.questions.length) * 100)
      : 0;
    const passed = score >= homework.passingScore;

    // Record individual answers and update attempt in a transaction
    await this.prisma.$transaction([
      this.prisma.homeworkAnswer.createMany({
        data: homeworkAnswerRecords,
      }),
      this.prisma.studentHomeworkAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          submitted: true,
          submittedAt: new Date(),
          score,
          passed,
        },
      }),
    ]);

    // Update lesson progress
    await this.updateLessonProgress(homework.lessonId, userId);

    return {
      id: latestAttempt.id,
      score,
      correctAnswers: correctAnswers.length,
      wrongAnswers: wrongAnswersList.length,
      totalQuestions: homework.questions.length,
      passed,
      attemptNum: latestAttempt.attemptNum,
      wrongAnswersList,
    };
  }

  async getResult(lessonId: string, userId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const latestAttempt = await this.prisma.studentHomeworkAttempt.findFirst({
      where: { userId, homeworkId: homework.id, submitted: true },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        score: true,
        passed: true,
        attemptNum: true,
        submittedAt: true,
      },
    });

    if (!latestAttempt) return null;

    return latestAttempt;
  }

  async getHistory(lessonId: string, userId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const attempts = await this.prisma.studentHomeworkAttempt.findMany({
      where: { userId, homeworkId: homework.id, submitted: true },
      orderBy: { attemptNum: "desc" },
      select: {
        id: true,
        attemptNum: true,
        score: true,
        passed: true,
        submittedAt: true,
      },
    });

    return attempts;
  }

  async reviewAnswers(lessonId: string, userId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            correctAnswer: true,
            explanation: true,
          },
        },
      },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    if (!homework.showAnswers) {
      return { score: null, passed: null, questions: [], message: "Answer review is not available for this homework." };
    }

    const latestAttempt = await this.prisma.studentHomeworkAttempt.findFirst({
      where: { userId, homeworkId: homework.id, submitted: true },
      orderBy: { submittedAt: "desc" },
      include: {
        answers: {
          select: {
            questionId: true,
            answer: true,
            isCorrect: true,
          },
        },
      },
    });

    if (!latestAttempt) throw new NotFoundException("No completed attempt found");

    const answerMap = new Map(latestAttempt.answers.map((a) => [a.questionId, a]));

    return {
      score: latestAttempt.score,
      passed: latestAttempt.passed,
      attemptNum: latestAttempt.attemptNum,
      questions: homework.questions.map((q) => {
        const studentAnswer = answerMap.get(q.id);
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          studentAnswer: studentAnswer?.answer ?? null,
          isCorrect: studentAnswer?.isCorrect ?? null,
        };
      }),
    };
  }

  async getStatus(lessonId: string, userId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
      select: {
        id: true,
        lessonId: true,
        title: true,
        maxAttempts: true,
        passingScore: true,
        attempts: {
          where: { userId },
          orderBy: { attemptNum: "desc" },
          select: {
            id: true,
            attemptNum: true,
            submitted: true,
            passed: true,
            score: true,
            startedAt: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const attempts = homework.attempts;
    const activeAttempt = attempts.find((a) => !a.submitted);
    const lastSubmitted = attempts.find((a) => a.submitted);
    const submittedAttempts = attempts.filter((a) => a.submitted && a.score !== null);
    const bestAttempt = submittedAttempts.length > 0
      ? submittedAttempts.reduce((best, current) => ((current.score ?? 0) > (best.score ?? 0) ? current : best))
      : null;

    let status: string;
    if (attempts.length === 0) {
      status = "AVAILABLE";
    } else if (activeAttempt) {
      status = "IN_PROGRESS";
    } else if (lastSubmitted?.passed === true) {
      status = "COMPLETED";
    } else if (lastSubmitted) {
      status = "SUBMITTED";
    } else {
      status = "AVAILABLE";
    }

    return {
      homeworkId: homework.id,
      lessonId: homework.lessonId,
      title: homework.title,
      status,
      passingScore: homework.passingScore,
      maxAttempts: homework.maxAttempts,
      attemptCount: attempts.length,
      bestScore: bestAttempt?.score ?? null,
      lastScore: lastSubmitted?.score ?? null,
      isPassed: lastSubmitted?.passed ?? null,
      activeAttemptId: activeAttempt?.id ?? null,
    };
  }

  // --- Teacher / Admin Management ---

  async createHomework(dto: CreateHomeworkDto): Promise<unknown> {
    // Verify lesson exists
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    // Check if homework already exists for this lesson
    const existing = await this.prisma.homework.findFirst({ where: { lessonId: dto.lessonId, deletedAt: null } });
    if (existing) throw new ForbiddenException("Homework already exists for this lesson");

    const homework = await this.prisma.homework.create({
      data: {
        lessonId: dto.lessonId,
        title: dto.title ?? "Homework",
        instructions: dto.instructions,
        passingScore: dto.passingScore ?? 70,
        maxAttempts: dto.maxAttempts ?? 3,
        xpReward: dto.xpReward ?? 50,
        published: dto.published ?? true,
        allowRetry: dto.allowRetry ?? true,
        showAnswers: dto.showAnswers ?? true,
        questions: {
          createMany: {
            data: dto.questions.map((q) => ({
              type: q.type,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              displayOrder: q.displayOrder ?? 0,
            })),
          },
        },
      },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: { id: true, type: true, question: true, options: true, correctAnswer: true, explanation: true, displayOrder: true },
        },
      },
    });

    // Enable homework on the lesson
    await this.prisma.lesson.update({
      where: { id: dto.lessonId },
      data: { homeworkEnabled: true },
    });

    return homework;
  }

  async updateHomework(homeworkId: string, dto: UpdateHomeworkDto): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({ where: { id: homeworkId, deletedAt: null } });
    if (!homework) throw new NotFoundException("Homework not found");

    if (dto.questions) {
      await this.prisma.homeworkQuestion.deleteMany({ where: { homeworkId } });

      if (dto.questions.length > 0) {
        await this.prisma.homeworkQuestion.createMany({
          data: dto.questions.map((q) => ({
            homeworkId,
            type: q.type ?? "MULTIPLE_CHOICE",
            question: q.question ?? "",
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            displayOrder: q.displayOrder ?? 0,
          })),
        });
      }
    }

    const updated = await this.prisma.homework.update({
      where: { id: homeworkId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.passingScore !== undefined ? { passingScore: dto.passingScore } : {}),
        ...(dto.maxAttempts !== undefined ? { maxAttempts: dto.maxAttempts } : {}),
        ...(dto.xpReward !== undefined ? { xpReward: dto.xpReward } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.allowRetry !== undefined ? { allowRetry: dto.allowRetry } : {}),
        ...(dto.showAnswers !== undefined ? { showAnswers: dto.showAnswers } : {}),
      },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: { id: true, type: true, question: true, options: true, correctAnswer: true, explanation: true, displayOrder: true },
        },
      },
    });

    return updated;
  }

  async deleteHomework(homeworkId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({ where: { id: homeworkId, deletedAt: null } });
    if (!homework) throw new NotFoundException("Homework not found");

    // Soft delete
    await this.prisma.homework.update({
      where: { id: homeworkId },
      data: { deletedAt: new Date() },
    });

    // Disable homework on the lesson
    await this.prisma.lesson.update({
      where: { id: homework.lessonId },
      data: { homeworkEnabled: false },
    });

    return { deleted: true };
  }

  // --- Save Progress ---

  async saveProgress(lessonId: string, userId: string, answers: SaveAnswerDto[]): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const attempt = await this.prisma.studentHomeworkAttempt.findFirst({
      where: { userId, homeworkId: homework.id, submitted: false },
      orderBy: { attemptNum: "desc" },
    });

    if (!attempt) return { success: true, message: "No active attempt to save to" };

    // Upsert answers
    await Promise.all(
      answers.map((a) =>
        this.prisma.homeworkAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: a.questionId,
            },
          },
          update: { answer: a.selectedAnswer ?? "" },
          create: {
            attemptId: attempt.id,
            questionId: a.questionId,
            answer: a.selectedAnswer ?? "",
          },
        }),
      ),
    );

    return { success: true };
  }

  // --- Analytics ---

  async getAnalytics(lessonId: string): Promise<unknown> {
    const homework = await this.prisma.homework.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!homework) throw new NotFoundException("Homework not found");

    const attempts = await this.prisma.studentHomeworkAttempt.findMany({
      where: { homeworkId: homework.id, submitted: true },
      select: {
        score: true,
        passed: true,
      },
    });

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed).length;
    const scores = attempts.map((a) => a.score ?? 0);

    // Find most missed questions
    const wrongAnswers = await this.prisma.homeworkAnswer.findMany({
      where: {
        attempt: { homeworkId: homework.id, submitted: true },
        isCorrect: false,
      },
      include: {
        question: { select: { id: true, question: true } },
      },
    });

    const questionMissCount = new Map<string, { question: string; count: number }>();
    for (const wa of wrongAnswers) {
      const existing = questionMissCount.get(wa.questionId);
      if (existing) {
        existing.count++;
      } else {
        questionMissCount.set(wa.questionId, { question: wa.question.question, count: 1 });
      }
    }

    const mostMissedQuestions = Array.from(questionMissCount.entries())
      .map(([id, data]) => ({ questionId: id, question: data.question, missCount: data.count }))
      .sort((a, b) => b.missCount - a.missCount);

    return {
      homeworkId: homework.id,
      lessonId,
      title: homework.title,
      totalAttempts,
      totalStudents: await this.prisma.studentHomeworkAttempt.groupBy({
        by: ["userId"],
        where: { homeworkId: homework.id, submitted: true },
      }).then((r) => r.length),
      averageScore: totalAttempts > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      completionRate: totalAttempts > 0 ? 100 : 0, // Assuming all started have submitted (tracked via submitted filter)
      mostMissedQuestions,
    };
  }

  // --- Private helpers ---

  private async updateLessonProgress(lessonId: string, userId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { progress: { where: { userId }, select: { id: true, progress: true } } },
    });

    if (!lesson) return;

    const currentProgress = lesson.progress[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (currentProgress) {
      const hwProgress = Math.min(100, currentProgress.progress + 10);
      await this.prisma.lessonProgress.update({
        where: { id: currentProgress.id },
        data: { progress: hwProgress },
      });
    }
  }
}
