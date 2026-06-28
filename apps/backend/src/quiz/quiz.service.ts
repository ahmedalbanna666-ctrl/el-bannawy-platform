import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateQuizDto } from "./dto/create-quiz.dto";
import type { UpdateQuizDto } from "./dto/update-quiz.dto";
import type { SaveQuizAnswerDto } from "./dto/save-quiz.dto";

interface QuizSummary {
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
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuiz(lessonId: string): Promise<QuizSummary | null> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.quizEnabled) return null;

    const quiz = await this.prisma.quiz.findFirst({
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

    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  async getQuestions(lessonId: string): Promise<unknown> {
    const quiz = await this.getQuiz(lessonId);
    if (!quiz) throw new NotFoundException("Quiz not found");

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
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
    const quiz = await this.getQuiz(lessonId);
    if (!quiz) throw new NotFoundException("Quiz not found");

    // Validate prerequisites: videos completed and homework submitted (if enabled)
    await this.validatePrerequisites(lessonId, userId);

    const totalAttempts = await this.prisma.quizAttempt.count({
      where: { userId, quizId: quiz.id },
    });

    if (totalAttempts >= quiz.maxAttempts) {
      throw new ForbiddenException("Maximum attempts reached");
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
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

  async submitQuiz(
    lessonId: string,
    userId: string,
    answers: string[],
    _response?: string,
  ): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
      include: {
        questions: { orderBy: { displayOrder: "asc" } },
      },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const latestAttempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: false },
      orderBy: { attemptNum: "desc" },
    });

    if (!latestAttempt) throw new ForbiddenException("No active attempt found. Start a new attempt first.");

    const quizAnswerRecords: { attemptId: string; questionId: string; answer: string; isCorrect: boolean }[] = [];
    const wrongAnswersList: { questionId: string; studentAnswer: string; correctAnswer: string }[] = [];
    let correctCount = 0;

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const studentAnswer = i < answers.length ? answers[i].trim().toLowerCase() : "";
      const correct = (question.correctAnswer ?? "").trim().toLowerCase();
      const isCorrect = studentAnswer === correct;

      quizAnswerRecords.push({
        attemptId: latestAttempt.id,
        questionId: question.id,
        answer: studentAnswer,
        isCorrect,
      });

      if (isCorrect) {
        correctCount++;
      } else {
        wrongAnswersList.push({
          questionId: question.id,
          studentAnswer,
          correctAnswer: correct,
        });
      }
    }

    const score = quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;
    const passed = score >= quiz.passingScore;

    await this.prisma.$transaction([
      this.prisma.quizAnswer.createMany({ data: quizAnswerRecords }),
      this.prisma.quizAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          submitted: true,
          submittedAt: new Date(),
          score,
          passed,
        },
      }),
    ]);

    let xpAwarded = 0;
    let nextLessonUnlocked = false;

    if (passed) {
      // Award XP
      xpAwarded = quiz.xpReward;
      await this.prisma.xPTransaction.create({
        data: {
          userId,
          amount: quiz.xpReward,
          reason: `Passed quiz for lesson ${lessonId}`,
          reference: quiz.id,
        },
      });

      // Mark lesson as completed
      await this.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: { completed: true, completedAt: new Date(), progress: 100 },
        create: { userId, lessonId, completed: true, completedAt: new Date(), progress: 100 },
      });

      // Unlock next lesson if configured
      nextLessonUnlocked = await this.unlockNextLesson(lessonId, userId);
    }

    return {
      id: latestAttempt.id,
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongAnswersList.length,
      totalQuestions: quiz.questions.length,
      passed,
      attemptNum: latestAttempt.attemptNum,
      xpAwarded,
      nextLessonUnlocked,
      wrongAnswersList,
    };
  }

  async getResult(lessonId: string, userId: string): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const latestAttempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: true },
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
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, quizId: quiz.id, submitted: true },
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
    const quiz = await this.prisma.quiz.findFirst({
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

    if (!quiz) throw new NotFoundException("Quiz not found");

    if (!quiz.showAnswers) {
      return { score: null, passed: null, questions: [], message: "Answer review is not available for this quiz." };
    }

    const latestAttempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: true },
      orderBy: { submittedAt: "desc" },
      include: {
        answers: {
          select: { questionId: true, answer: true, isCorrect: true },
        },
      },
    });

    if (!latestAttempt) throw new NotFoundException("No completed attempt found");

    const answerMap = new Map(latestAttempt.answers.map((a) => [a.questionId, a]));

    return {
      score: latestAttempt.score,
      passed: latestAttempt.passed,
      attemptNum: latestAttempt.attemptNum,
      questions: quiz.questions.map((q) => {
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

  async getUnlockStatus(lessonId: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, unitId: true, displayOrder: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { completed: true },
    });

    const lessonCompleted = progress?.completed ?? false;

    let nextLessonUnlocked = false;
    if (lessonCompleted) {
      const nextLesson = await this.prisma.lesson.findFirst({
        where: {
          unitId: lesson.unitId,
          displayOrder: lesson.displayOrder + 1,
        },
        select: { id: true },
      });

      if (nextLesson) {
        const nextSettings = await this.prisma.lessonSettings.findUnique({
          where: { lessonId: nextLesson.id },
        });
        nextLessonUnlocked = nextSettings?.unlockNextOnComplete !== false;
      }
    }

    return { lessonCompleted, nextLessonUnlocked };
  }

  // --- Teacher / Admin Management ---

  async createQuiz(dto: CreateQuizDto): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    const existing = await this.prisma.quiz.findFirst({ where: { lessonId: dto.lessonId, deletedAt: null } });
    if (existing) throw new ForbiddenException("Quiz already exists for this lesson");

    const quiz = await this.prisma.quiz.create({
      data: {
        lessonId: dto.lessonId,
        title: dto.title ?? "End Lesson Assessment",
        instructions: dto.instructions,
        passingScore: dto.passingScore ?? 70,
        maxAttempts: dto.maxAttempts ?? 3,
        xpReward: dto.xpReward ?? 100,
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

    await this.prisma.lesson.update({
      where: { id: dto.lessonId },
      data: { quizEnabled: true },
    });

    return quiz;
  }

  async updateQuiz(quizId: string, dto: UpdateQuizDto): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
    if (!quiz) throw new NotFoundException("Quiz not found");

    if (dto.questions) {
      await this.prisma.quizAnswer.deleteMany({ where: { question: { quizId } } });
      await this.prisma.quizQuestion.deleteMany({ where: { quizId } });

      if (dto.questions.length > 0) {
        await this.prisma.quizQuestion.createMany({
          data: dto.questions.map((q) => ({
            quizId,
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

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
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

  async deleteQuiz(quizId: string): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
    if (!quiz) throw new NotFoundException("Quiz not found");

    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.lesson.update({
      where: { id: quiz.lessonId },
      data: { quizEnabled: false },
    });

    return { deleted: true };
  }

  // --- Save Progress ---

  async saveProgress(lessonId: string, userId: string, answers: SaveQuizAnswerDto[]): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: false },
      orderBy: { attemptNum: "desc" },
    });

    if (!attempt) return { success: true, message: "No active attempt to save to" };

    await Promise.all(
      answers.map((a) =>
        this.prisma.quizAnswer.upsert({
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
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const allAttempts = await this.prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, submitted: true },
      select: { score: true, passed: true },
    });

    const totalAttempts = allAttempts.length;
    const passedAttempts = allAttempts.filter((a) => a.passed).length;
    const scores = allAttempts.map((a) => a.score ?? 0);

    const wrongAnswers = await this.prisma.quizAnswer.findMany({
      where: {
        attempt: { quizId: quiz.id, submitted: true },
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
      quizId: quiz.id,
      lessonId,
      title: quiz.title,
      totalAttempts,
      totalStudents: await this.prisma.quizAttempt.groupBy({
        by: ["userId"],
        where: { quizId: quiz.id, submitted: true },
      }).then((r) => r.length),
      averageScore: totalAttempts > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      failureRate: totalAttempts > 0 ? Math.round(((totalAttempts - passedAttempts) / totalAttempts) * 100) : 0,
      mostMissedQuestions,
    };
  }

  // --- Private Helpers ---

  private async validatePrerequisites(lessonId: string, userId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { homeworkEnabled: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    // Check all videos completed
    const videos = await this.prisma.lessonVideo.findMany({
      where: { lessonId, enabled: true },
      select: { id: true },
    });

    for (const video of videos) {
      const progress = await this.prisma.videoProgress.findUnique({
        where: { userId_videoId: { userId, videoId: video.id } },
      });
      if (!progress?.completed) {
        throw new ForbiddenException("All lesson videos must be completed before taking the quiz");
      }
    }

    // Check homework submitted (if enabled)
    if (lesson.homeworkEnabled) {
      const homework = await this.prisma.homework.findFirst({
        where: { lessonId, deletedAt: null },
      });
      if (homework) {
        const hwAttempt = await this.prisma.studentHomeworkAttempt.findFirst({
          where: { userId, homeworkId: homework.id, submitted: true },
        });
        if (!hwAttempt) {
          throw new ForbiddenException("Homework must be submitted before taking the quiz");
        }
      }
    }
  }

  private async unlockNextLesson(currentLessonId: string, userId: string): Promise<boolean> {
    const currentLesson = await this.prisma.lesson.findUnique({
      where: { id: currentLessonId },
      select: { unitId: true, displayOrder: true },
    });

    if (!currentLesson) return false;

    const nextLesson = await this.prisma.lesson.findFirst({
      where: {
        unitId: currentLesson.unitId,
        displayOrder: currentLesson.displayOrder + 1,
      },
      select: { id: true, settings: true },
    });

    if (!nextLesson) return false;

    // Check if next lesson unlock is enabled
    if (nextLesson.settings?.unlockNextOnComplete === false) return false;

    // Create progress entry for the next lesson (unlocking it)
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: nextLesson.id } },
      update: {},
      create: { userId, lessonId: nextLesson.id, progress: 0 },
    });

    return true;
  }
}
