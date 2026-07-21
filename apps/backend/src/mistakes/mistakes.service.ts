/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-optional-chain, @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { MistakeQueryDto, MistakeSource } from "./dto/mistake-query.dto";
import type { CreateMiniExamDto } from "./dto/create-mini-exam.dto";
import type { SubmitMiniExamDto } from "./dto/submit-mini-exam.dto";

interface MistakeOption {
  text: string;
  isCorrect: boolean;
}

interface WrongAnswerItem {
  questionId: string;
  source: MistakeSource;
  question: string;
  options: MistakeOption[];
  correctAnswer: string;
  studentAnswer: string | null;
  explanation: string | null;
  answeredAt: string;
  attemptId: string;
  unitId: string | null;
  lessonId: string | null;
  storyId: string | null;
  chapterId: string | null;
  unitTitle: string | null;
  lessonTitle: string | null;
  storyTitle: string | null;
  chapterTitle: string | null;
  termId: string | null;
}

interface MiniExamQuestion {
  questionId: string;
  source: string;
  question: string;
  options: MistakeOption[];
  explanation: string | null;
}

interface MiniExamSummary {
  id: string;
  questionCount: number;
  durationMinutes: number;
  poolSize: number;
  status: string;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  createdAt: string;
  submittedAt: string | null;
  questions: MiniExamQuestion[];
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  sourceCounts: Partial<Record<MistakeSource, number>>;
}

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseJsonOptions(
    optionsRaw: string | null,
    correctAnswer: string | null,
  ): MistakeOption[] {
    if (!optionsRaw) return [];
    try {
      const parsed: string[] = JSON.parse(optionsRaw) as string[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((text) => ({
        text,
        isCorrect: text === correctAnswer,
      }));
    } catch {
      return [];
    }
  }

  async getWrongAnswers(
    userId: string,
    params: MistakeQueryDto,
  ): Promise<PaginatedResult<WrongAnswerItem>> {
    const { studentId } = await this.resolveUserContext(userId, params.studentId);
    const scopeFilter = this.getScopeDateFilter(params.scope);

    const [quizItems, homeworkItems, assessmentItems, storyItems] = await Promise.all([
      this.getQuizWrongAnswers(studentId, scopeFilter),
      this.getHomeworkWrongAnswers(studentId, scopeFilter),
      this.getAssessmentWrongAnswers(studentId, scopeFilter),
      this.getStoryWrongAnswers(studentId, scopeFilter),
    ]);

    let all: WrongAnswerItem[] = [
      ...quizItems,
      ...homeworkItems,
      ...assessmentItems,
      ...storyItems,
    ];

    if (params.source) {
      all = all.filter((item) => item.source === params.source);
    }
    if (params.unitId) {
      all = all.filter((item) => item.unitId === params.unitId);
    }
    if (params.unitIds && params.unitIds.length > 0) {
      const selected = new Set(params.unitIds);
      all = all.filter((item) => item.unitId !== null && selected.has(item.unitId));
    }
    if (params.lessonId) {
      all = all.filter((item) => item.lessonId === params.lessonId);
    }
    if (params.storyId) {
      all = all.filter((item) => item.storyId === params.storyId);
    }
    if (params.chapterId) {
      all = all.filter((item) => item.chapterId === params.chapterId);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      all = all.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.correctAnswer?.toLowerCase().includes(q),
      );
    }

    all.sort(
      (a, b) =>
        new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime(),
    );

    const sourceCounts: Partial<Record<MistakeSource, number>> = {};
    for (const item of all) {
      sourceCounts[item.source] = (sourceCounts[item.source] ?? 0) + 1;
    }

    const total = all.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const items = all.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit, sourceCounts };
  }

  async getFilters(
    userId: string,
    studentIdParam?: string,
  ): Promise<{
    units: { id: string; title: string }[];
    lessons: { id: string; title: string }[];
    stories: { id: string; title: string }[];
    chapters: { id: string; title: string }[];
    sources: MistakeSource[];
  }> {
    const { studentId } = await this.resolveUserContext(userId, studentIdParam);

    const [quizItems, homeworkItems, assessmentItems, storyItems] =
      await Promise.all([
        this.getQuizWrongAnswers(studentId, null),
        this.getHomeworkWrongAnswers(studentId, null),
        this.getAssessmentWrongAnswers(studentId, null),
        this.getStoryWrongAnswers(studentId, null),
      ]);

    const all = [
      ...quizItems,
      ...homeworkItems,
      ...assessmentItems,
      ...storyItems,
    ];

    const unitMap = new Map<string, string>();
    const lessonMap = new Map<string, string>();
    const storyMap = new Map<string, string>();
    const chapterMap = new Map<string, string>();
    const sourceSet = new Set<MistakeSource>();

    for (const item of all) {
      if (item.unitId && item.unitTitle) unitMap.set(item.unitId, item.unitTitle);
      if (item.lessonId && item.lessonTitle)
        lessonMap.set(item.lessonId, item.lessonTitle);
      if (item.storyId && item.storyTitle)
        storyMap.set(item.storyId, item.storyTitle);
      if (item.chapterId && item.chapterTitle)
        chapterMap.set(item.chapterId, item.chapterTitle);
      sourceSet.add(item.source);
    }

    return {
      units: Array.from(unitMap.entries()).map(([id, title]) => ({ id, title })),
      lessons: Array.from(lessonMap.entries()).map(([id, title]) => ({
        id,
        title,
      })),
      stories: Array.from(storyMap.entries()).map(([id, title]) => ({ id, title })),
      chapters: Array.from(chapterMap.entries()).map(([id, title]) => ({
        id,
        title,
      })),
      sources: Array.from(sourceSet),
    };
  }

  async createMiniExam(
    userId: string,
    dto: CreateMiniExamDto,
  ): Promise<MiniExamSummary> {
    const { studentId } = await this.resolveUserContext(userId, dto.studentId);
    const scopeFilter = this.getScopeDateFilter("all");

    const [quizItems, homeworkItems, assessmentItems, storyItems] =
      await Promise.all([
        this.getQuizWrongAnswers(studentId, scopeFilter),
        this.getHomeworkWrongAnswers(studentId, scopeFilter),
        this.getAssessmentWrongAnswers(studentId, scopeFilter),
        this.getStoryWrongAnswers(studentId, scopeFilter),
      ]);

    let pool = [
      ...quizItems,
      ...homeworkItems,
      ...assessmentItems,
      ...storyItems,
    ];

    if (dto.source) {
      pool = pool.filter((item) => item.source === dto.source);
    }
    if (dto.unitId) {
      pool = pool.filter((item) => item.unitId === dto.unitId);
    }
    if (dto.unitIds && dto.unitIds.length > 0) {
      const selected = new Set(dto.unitIds);
      pool = pool.filter((item) => item.unitId !== null && selected.has(item.unitId));
    }
    if (dto.lessonId) {
      pool = pool.filter((item) => item.lessonId === dto.lessonId);
    }
    if (dto.storyId) {
      pool = pool.filter((item) => item.storyId === dto.storyId);
    }
    if (dto.chapterId) {
      pool = pool.filter((item) => item.chapterId === dto.chapterId);
    }
    if (dto.search) {
      const q = dto.search.toLowerCase();
      pool = pool.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.correctAnswer?.toLowerCase().includes(q),
      );
    }

    if (pool.length === 0) {
      throw new BadRequestException("No mistakes found matching the criteria");
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(dto.questionCount, pool.length));

    const questions: MiniExamQuestion[] = selected.map((item) => ({
      questionId: item.questionId,
      source: item.source,
      question: item.question,
      options: item.options,
      explanation: item.explanation,
    }));

    const miniExam = await this.prisma.miniExam.create({
      data: {
        userId: studentId,
        questionCount: questions.length,
        durationMinutes: dto.durationMinutes,
        poolSize: pool.length,
        usedCount: 0,
        questions: JSON.parse(JSON.stringify(questions)),
        status: "CREATED",
      },
    });

    return this.formatMiniExamSummary(miniExam);
  }

  async getMiniExam(examId: string, userId: string): Promise<MiniExamSummary> {
    const { role } = await this.resolveUserContext(userId);

    const miniExam = await this.prisma.miniExam.findUnique({
      where: { id: examId },
    });

    if (!miniExam) {
      throw new NotFoundException("Mini exam not found");
    }

    if (role === "STUDENT" && miniExam.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return this.formatMiniExamSummary(miniExam);
  }

  async submitMiniExam(
    examId: string,
    userId: string,
    dto: SubmitMiniExamDto,
  ): Promise<MiniExamSummary> {
    const { role } = await this.resolveUserContext(userId);

    const miniExam = await this.prisma.miniExam.findUnique({
      where: { id: examId },
    });

    if (!miniExam) {
      throw new NotFoundException("Mini exam not found");
    }

    if (role === "STUDENT" && miniExam.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    if (miniExam.status !== "CREATED") {
      throw new BadRequestException("Mini exam already submitted");
    }

    const questions = (miniExam.questions as MiniExamQuestion[] | null) ?? [];
    let correctCount = 0;

    const answerRecords = questions.map((q) => {
      const submitted = dto.answers.find((a) => a.questionId === q.questionId);
      const correctOption = q.options.find((o) => o.isCorrect);
      const isCorrect = submitted
        ? submitted.answer === correctOption?.text
        : false;
      if (isCorrect) correctCount++;

      return {
        examId,
        questionId: q.questionId,
        answer: submitted?.answer ?? null,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const passingThreshold = Math.ceil(totalQuestions * 0.7);
    const score = correctCount;
    const maxScore = totalQuestions;
    const passed = score >= passingThreshold;

    await this.prisma.$transaction([
      this.prisma.miniExamAnswer.createMany({ data: answerRecords }),
      this.prisma.miniExam.update({
        where: { id: examId },
        data: {
          status: "SUBMITTED",
          score,
          maxScore,
          passed,
          submittedAt: new Date(),
        },
      }),
    ]);

    const updated = await this.prisma.miniExam.findUnique({
      where: { id: examId },
    });

    if (!updated) {
      throw new NotFoundException("Mini exam not found after update");
    }

    return this.formatMiniExamSummary(updated);
  }

  async getMiniExamHistory(
    userId: string,
    studentIdParam?: string,
  ): Promise<MiniExamSummary[]> {
    const { studentId } = await this.resolveUserContext(userId, studentIdParam);

    const exams = await this.prisma.miniExam.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return exams.map((e) => this.formatMiniExamSummary(e));
  }

  private async resolveUserContext(
    userId: string,
    requestedStudentId?: string,
  ): Promise<{ userId: string; studentId: string; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = user?.role ?? "STUDENT";

    if (role === "STUDENT") {
      return { userId, studentId: userId, role };
    }

    if (requestedStudentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: requestedStudentId },
        select: { id: true },
      });
      if (!student) {
        throw new NotFoundException("Student not found");
      }
      return { userId, studentId: requestedStudentId, role };
    }

    return { userId, studentId: userId, role };
  }

  private getScopeDateFilter(
    scope?: "all" | "today" | "term",
  ): Date | null {
    if (!scope || scope === "all") return null;

    if (scope === "today") {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return null;
  }

  private async getQuizWrongAnswers(
    studentId: string,
    scopeFilter: Date | null,
  ): Promise<WrongAnswerItem[]> {
    const answers = await this.prisma.quizAnswer.findMany({
      where: {
        isCorrect: false,
        createdAt: scopeFilter ? { gte: scopeFilter } : undefined,
        attempt: { userId: studentId, submitted: true },
      },
      include: {
        question: {
          select: {
            id: true,
            question: true,
            correctAnswer: true,
            explanation: true,
            options: true,
          },
        },
        attempt: {
          select: {
            id: true,
            quiz: {
              select: {
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    unit: {
                      select: {
                        id: true,
                        title: true,
                        termId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return answers
      .filter((a) => a.question && a.attempt)
      .map((a) => {
        const quiz = a.attempt.quiz;
        const lesson = quiz?.lesson;
        const unit = lesson?.unit;
        return {
          questionId: a.question.id,
          source: "QUIZ" as MistakeSource,
          question: a.question.question,
          options: this.parseJsonOptions(
            a.question.options,
            a.question.correctAnswer,
          ),
          correctAnswer: a.question.correctAnswer ?? "",
          studentAnswer: a.answer ?? null,
          explanation: a.question.explanation,
          answeredAt: a.createdAt.toISOString(),
          attemptId: a.attempt.id,
          unitId: unit?.id ?? null,
          lessonId: lesson?.id ?? null,
          storyId: null,
          chapterId: null,
          unitTitle: unit?.title ?? null,
          lessonTitle: lesson?.title ?? null,
          storyTitle: null,
          chapterTitle: null,
          termId: unit?.termId ?? null,
        };
      });
  }

  private async getHomeworkWrongAnswers(
    studentId: string,
    scopeFilter: Date | null,
  ): Promise<WrongAnswerItem[]> {
    const answers = await this.prisma.homeworkAnswer.findMany({
      where: {
        isCorrect: false,
        createdAt: scopeFilter ? { gte: scopeFilter } : undefined,
        attempt: { userId: studentId, submitted: true },
      },
      include: {
        question: {
          select: {
            id: true,
            question: true,
            correctAnswer: true,
            explanation: true,
            options: true,
          },
        },
        attempt: {
          select: {
            id: true,
            homework: {
              select: {
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    unit: {
                      select: {
                        id: true,
                        title: true,
                        termId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return answers
      .filter((a) => a.question && a.attempt)
      .map((a) => {
        const homework = a.attempt.homework;
        const lesson = homework?.lesson;
        const unit = lesson?.unit;
        return {
          questionId: a.question.id,
          source: "HOMEWORK" as MistakeSource,
          question: a.question.question,
          options: this.parseJsonOptions(
            a.question.options,
            a.question.correctAnswer,
          ),
          correctAnswer: a.question.correctAnswer ?? "",
          studentAnswer: a.answer ?? null,
          explanation: a.question.explanation,
          answeredAt: a.createdAt.toISOString(),
          attemptId: a.attempt.id,
          unitId: unit?.id ?? null,
          lessonId: lesson?.id ?? null,
          storyId: null,
          chapterId: null,
          unitTitle: unit?.title ?? null,
          lessonTitle: lesson?.title ?? null,
          storyTitle: null,
          chapterTitle: null,
          termId: unit?.termId ?? null,
        };
      });
  }

  private async getAssessmentWrongAnswers(
    studentId: string,
    scopeFilter: Date | null,
  ): Promise<WrongAnswerItem[]> {
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: {
        isCorrect: false,
        createdAt: scopeFilter ? { gte: scopeFilter } : undefined,
        attempt: {
          studentId,
          status: { in: ["SUBMITTED", "COMPLETED", "AUTO_SUBMITTED"] },
        },
      },
      include: {
        question: {
          select: {
            id: true,
            prompt: true,
            explanation: true,
            options: {
              select: { text: true, isCorrect: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        attempt: {
          select: {
            id: true,
            assessment: {
              select: {
                lessonId: true,
                unitId: true,
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    unit: {
                      select: {
                        id: true,
                        title: true,
                        termId: true,
                      },
                    },
                  },
                },
                unit: {
                  select: {
                    id: true,
                    title: true,
                    termId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return answers
      .filter((a) => a.question && a.attempt)
      .map((a) => {
        const assessment = a.attempt.assessment;
        const lesson = assessment?.lesson;
        const unit = assessment?.unit ?? lesson?.unit;
        const correctOption = a.question.options.find((o) => o.isCorrect);
        return {
          questionId: a.question.id,
          source: "ASSESSMENT" as MistakeSource,
          question: a.question.prompt,
          options: a.question.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
          correctAnswer: correctOption?.text ?? "",
          studentAnswer:
            a.answer === null || a.answer === undefined
              ? null
              : typeof a.answer === "string"
                ? a.answer
                : JSON.stringify(a.answer),
          explanation: a.question.explanation,
          answeredAt: a.createdAt.toISOString(),
          attemptId: a.attempt.id,
          unitId: unit?.id ?? null,
          lessonId: lesson?.id ?? null,
          storyId: null,
          chapterId: null,
          unitTitle: unit?.title ?? null,
          lessonTitle: lesson?.title ?? null,
          storyTitle: null,
          chapterTitle: null,
          termId: unit?.termId ?? null,
        };
      });
  }

  private async getStoryWrongAnswers(
    studentId: string,
    scopeFilter: Date | null,
  ): Promise<WrongAnswerItem[]> {
    const answers = await this.prisma.storyChapterAnswer.findMany({
      where: {
        isCorrect: false,
        createdAt: scopeFilter ? { gte: scopeFilter } : undefined,
        attempt: { userId: studentId, submitted: true },
      },
      include: {
        question: {
          select: {
            id: true,
            question: true,
            explanation: true,
            storyChapterId: true,
            chapter: {
              select: {
                id: true,
                title: true,
              },
            },
            options: {
              select: { text: true, isCorrect: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        attempt: {
          select: {
            id: true,
            storyId: true,
            story: {
              select: {
                id: true,
                title: true,
                termId: true,
              },
            },
          },
        },
      },
    });

    return answers
      .filter((a) => a.question && a.attempt)
      .map((a) => {
        const correctOption = a.question.options.find((o) => o.isCorrect);
        const story = a.attempt.story;
        const chapter = a.question.chapter;
        return {
          questionId: a.question.id,
          source: "STORY" as MistakeSource,
          question: a.question.question,
          options: a.question.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
          correctAnswer: correctOption?.text ?? "",
          studentAnswer: a.answer ?? null,
          explanation: a.question.explanation,
          answeredAt: a.createdAt.toISOString(),
          attemptId: a.attempt.id,
          unitId: null,
          lessonId: null,
          storyId: story?.id ?? null,
          chapterId: chapter?.id ?? null,
          unitTitle: null,
          lessonTitle: null,
          storyTitle: story?.title ?? null,
          chapterTitle: chapter?.title ?? null,
          termId: story?.termId ?? null,
        };
      });
  }

  private formatMiniExamSummary(exam: {
    id: string;
    questionCount: number;
    durationMinutes: number;
    poolSize: number;
    status: string;
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
    createdAt: Date;
    submittedAt: Date | null;
    questions: unknown;
  }): MiniExamSummary {
    return {
      id: exam.id,
      questionCount: exam.questionCount,
      durationMinutes: exam.durationMinutes,
      poolSize: exam.poolSize,
      status: exam.status,
      score: exam.score,
      maxScore: exam.maxScore,
      passed: exam.passed,
      createdAt: exam.createdAt.toISOString(),
      submittedAt: exam.submittedAt?.toISOString() ?? null,
      questions: (exam.questions as MiniExamQuestion[] | null) ?? [],
    };
  }
}
