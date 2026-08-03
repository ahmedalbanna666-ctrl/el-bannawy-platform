import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { CacheService } from "../common/services/cache.service";
import { EssayEvaluationService } from "../essay-evaluation/essay-evaluation.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, NotificationTargetType } from "../notifications/dto/notification.dto";
import type { CreateQuizDto } from "./dto/create-quiz.dto";
import type { UpdateQuizDto } from "./dto/update-quiz.dto";
import type { SaveQuizAnswerDto } from "./dto/save-quiz.dto";
import type { ReviewQuizDto } from "./dto/review-quiz.dto";
import {
  isMultipleChoice,
  isMcqAnswerCorrect,
  formatMcqStudentAnswer,
} from "../common/utils/answer-evaluation";

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
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly essayEvaluation: EssayEvaluationService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  async getQuiz(lessonId: string, userId?: string): Promise<QuizSummary | null> {
    if (userId) await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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

  async getQuizForTeacher(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
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
            displayOrder: true,
          },
        },
      },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  async getQuestions(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const quiz = await this.getQuiz(lessonId, userId);
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
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const quiz = await this.getQuiz(lessonId, userId);
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
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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
            correctionMode: true,
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const latestAttempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: false },
      orderBy: { attemptNum: "desc" },
    });

    if (!latestAttempt) throw new ForbiddenException("No active attempt found. Start a new attempt first.");

    const quizAnswerRecords: {
      attemptId: string; questionId: string; answer: string; isCorrect: boolean;
      aiScore?: number; aiFeedback?: string; aiDetails?: unknown;
      grammarScore?: number; grammarErrors?: unknown;
      teacherReviewed?: boolean;
    }[] = [];
    const wrongAnswersList: { questionId: string; studentAnswer: string }[] = [];
    let correctCount = 0;

    const TEXT_QUESTION_TYPES = new Set(["FILL_IN_BLANKS", "SHORT_ANSWER", "ESSAY", "WRITING"]);
    const ESSAY_TYPES = new Set(["ESSAY", "WRITING"]);

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const rawAnswer = i < answers.length ? answers[i] : "";
      const studentAnswer = TEXT_QUESTION_TYPES.has(question.type) ? rawAnswer.trim() : rawAnswer.trim().toLowerCase();
      const correct = TEXT_QUESTION_TYPES.has(question.type) ? (question.correctAnswer ?? "").trim() : (question.correctAnswer ?? "").trim().toLowerCase();
      let isCorrect = isMultipleChoice(question.type)
        ? isMcqAnswerCorrect(question.options, question.correctAnswer, studentAnswer)
        : studentAnswer === correct;
      let aiScore: number | undefined;
      let aiFeedback: string | undefined;
      let aiDetails: unknown = undefined;
      let grammarScore: number | undefined;
      let grammarErrors: unknown = undefined;
      let teacherReviewed: boolean | undefined;

      // Run essay evaluation based on correction mode
      if (ESSAY_TYPES.has(question.type) && rawAnswer.trim()) {
        const mode = question.correctionMode;
        if (mode === "AI") {
          const aiResult = await this.essayEvaluation.evaluateAI(question.question, rawAnswer.trim());
          aiScore = aiResult.score;
          aiFeedback = aiResult.feedback;
          aiDetails = aiResult;
          isCorrect = aiResult.score >= 50;
        } else if (mode === "GRAMMAR_CHECK") {
          const grammarResult = this.essayEvaluation.evaluateGrammar(rawAnswer.trim());
          grammarScore = grammarResult.score;
          grammarErrors = grammarResult.errors;
          isCorrect = grammarResult.score >= 50;
        } else if (mode === "MANUAL") {
          isCorrect = false;
          teacherReviewed = false;
        }
      }

      quizAnswerRecords.push({
        attemptId: latestAttempt.id,
        questionId: question.id,
        answer: rawAnswer.trim(),
        isCorrect,
        aiScore,
        aiFeedback,
        aiDetails,
        grammarScore,
        grammarErrors,
        teacherReviewed,
      });

      if (isCorrect) {
        correctCount++;
      } else {
        wrongAnswersList.push({
          questionId: question.id,
          studentAnswer: rawAnswer.trim(),
        });
      }
    }

    const score = quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;
    const passed = score >= quiz.passingScore;

    await this.prisma.$transaction(async (tx) => {
      await tx.quizAnswer.createMany({ data: quizAnswerRecords as never });
      await tx.quizAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          submitted: true,
          submittedAt: new Date(),
          score,
          passed,
        },
      });

      if (passed) {
        await tx.xPTransaction.create({
          data: {
            userId,
            amount: quiz.xpReward,
            reason: `Passed quiz for lesson ${lessonId}`,
            reference: quiz.id,
          },
        });

        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId } },
          update: { completed: true, completedAt: new Date(), progress: 100 },
          create: { userId, lessonId, completed: true, completedAt: new Date(), progress: 100 },
        });
      }
    });

    if (passed) {
      await this.cache.delByPattern(`curriculum:${userId}:*`);
    }

    await this.cache.del(this.cache.generateKey("dashboard", userId));

    let xpAwarded = 0;
    let nextLessonUnlocked = false;

    if (passed) {
      xpAwarded = quiz.xpReward;
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
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const latestSubmitted = await this.prisma.quizAttempt.findFirst({
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

    const latestActive = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, submitted: false },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    });

    // A newer active (unsubmitted) attempt means the student is mid-quiz:
    // hide the stale result so they can keep answering.
    if (latestActive && (!latestSubmitted || latestActive.startedAt > (latestSubmitted.submittedAt ?? new Date(0)))) {
      return null;
    }

    return latestSubmitted;
  }

  async getHistory(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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
          studentAnswer: isMultipleChoice(q.type)
            ? formatMcqStudentAnswer(q.options, studentAnswer?.answer ?? null)
            : (studentAnswer?.answer ?? null),
          isCorrect: studentAnswer?.isCorrect ?? null,
        };
      }),
    };
  }

  async getUnlockStatus(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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

  async checkEligibility(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const quiz = await this.getQuiz(lessonId, userId);
    if (!quiz) throw new NotFoundException("Quiz not found");

    try {
      await this.validatePrerequisites(lessonId, userId);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        const message = (err as Error).message;
        return { eligible: false, reason: message };
      }
      throw err;
    }

    const totalAttempts = await this.prisma.quizAttempt.count({
      where: { userId, quizId: quiz.id },
    });
    if (totalAttempts >= quiz.maxAttempts) {
      return { eligible: false, reason: "Maximum attempts reached" };
    }

    return { eligible: true, reason: null };
  }

  // --- Teacher / Admin Management ---

  async createQuiz(dto: CreateQuizDto, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, dto.lessonId);
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

    const updatedLesson = await this.prisma.lesson.update({
      where: { id: dto.lessonId },
      data: { quizEnabled: true },
      include: { unit: { select: { gradeId: true } } },
    });

    const gradeId = updatedLesson.unit.gradeId;
    if (gradeId) {
      this.notifications
        .sendNotification(userId, {
          type: "quiz_reminder",
          title: "اختبار جديد",
          message: `تم إضافة اختبار جديد لدرس: ${lesson.title}`,
          priority: NotificationPriority.MEDIUM,
          targetType: NotificationTargetType.GRADE,
          targetId: gradeId,
        })
        .catch((err: unknown) => {
          this.logger.error(`Failed to send quiz notification: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    return quiz;
  }

  async updateQuiz(quizId: string, dto: UpdateQuizDto, userId: string): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    await this.academicContext.verifyTeacherLessonAccess(userId, quiz.lessonId);

    if (dto.questions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.quizAnswer.deleteMany({ where: { question: { quizId } } });
        await tx.quizQuestion.deleteMany({ where: { quizId } });

        if (dto.questions && dto.questions.length > 0) {
          await tx.quizQuestion.createMany({
            data: dto.questions.map((q) => ({
              quizId,
              type: q.type ?? "MULTIPLE_CHOICE",
              question: q.question ?? "",
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              correctionMode: q.correctionMode ?? "EXACT_MATCH",
              displayOrder: q.displayOrder ?? 0,
            })),
          });
        }
      });
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

  async deleteQuiz(quizId: string, userId: string): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    await this.academicContext.verifyTeacherLessonAccess(userId, quiz.lessonId);

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
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
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

  async getAnalytics(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherLessonAccess(userId, lessonId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });

    if (!quiz) throw new NotFoundException("Quiz not found");

    const allAttempts = await this.prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, submitted: true },
      take: 500,
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
      take: 500,
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

    const videoIds = videos.map((v) => v.id);
    const progressRecords = await this.prisma.videoProgress.findMany({
      where: { userId, videoId: { in: videoIds }, completed: true },
      select: { videoId: true },
    });
    const completedVideoIds = new Set(progressRecords.map((p) => p.videoId));
    const hasIncomplete = videoIds.some((vid) => !completedVideoIds.has(vid));
    if (hasIncomplete) {
      throw new ForbiddenException("All lesson videos must be completed before taking the quiz");
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

  // ── Teacher Review (Essay Grading) ──

  async teacherReview(lessonId: string, dto: ReviewQuizDto): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");

    const updates = (dto.reviews ?? []).map((r) =>
      this.prisma.quizAnswer.update({
        where: { id: r.answerId },
        data: {
          teacherScore: r.teacherScore,
          teacherFeedback: r.teacherFeedback ?? null,
          teacherReviewed: true,
          isCorrect: r.teacherScore >= 50,
        },
      }),
    );

    await this.prisma.$transaction(updates);

    // Recalculate attempt score
    const answers = await this.prisma.quizAnswer.findMany({
      where: { attemptId: dto.attemptId },
      select: { isCorrect: true },
    });

    const totalQuestions = answers.length;
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    await this.prisma.quizAttempt.update({
      where: { id: dto.attemptId },
      data: { score, passed: score >= quiz.passingScore },
    });

    return { attemptId: dto.attemptId, score, reviewed: updates.length };
  }

  async getPendingEssayReviews(lessonId: string): Promise<unknown> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, deletedAt: null },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, submitted: true },
      include: {
        user: { select: { id: true, fullName: true } },
        answers: {
          where: { teacherReviewed: false },
          include: {
            question: {
              select: { id: true, question: true, type: true, correctionMode: true },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return attempts;
  }
}
