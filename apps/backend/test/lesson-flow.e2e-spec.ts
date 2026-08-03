import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { cleanDb, closeTestDb, getTestDb } from "./helpers/test-db";
import { createTestUser } from "./helpers/test-factory";
import { v4 as uuidv4 } from "uuid";

jest.setTimeout(60000);

describe("Lesson Full Flow (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let lessonId: string;
  let videoId: string;
  let quizId: string;
  let questionIds: string[];
  let studentId: string;
  let cookies: string;

  beforeAll(async () => {
    prisma = getTestDb();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(cookieParser("el-bannawy-cookie-secret"));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await cleanDb(
      "users", "refresh_tokens", "sessions", "login_history",
      "stages", "grades", "academic_years", "terms",
      "units", "lessons", "lesson_videos", "quizzes",
      "quiz_questions", "quiz_attempts", "quiz_answers",
      "video_progress", "lesson_progress", "grade_schedules",
    );

    // ── Seed academic context + content ──
    const year = await prisma.academicYear.create({ data: { id: uuidv4(), name: "2026/2027" } });
    const term = await prisma.term.create({ data: { id: uuidv4(), name: "الترم الأول", academicYearId: year.id, displayOrder: 1 } });
    const stage = await prisma.stage.create({ data: { id: uuidv4(), name: "ثانوي", displayOrder: 1 } });
    const grade = await prisma.grade.create({ data: { id: uuidv4(), name: "الصف الأول الثانوي", displayOrder: 1, stageId: stage.id } });

    const unit = await prisma.unit.create({
      data: {
        id: uuidv4(), title: "Unit 1", gradeId: grade.id,
        academicYearId: year.id, termId: term.id,
        educationalSystem: "GENERAL", published: true,
      },
    });

    const lesson = await prisma.lesson.create({
      data: { id: uuidv4(), title: "Lesson 1", unitId: unit.id, published: true, quizEnabled: true },
    });

    const video = await prisma.lessonVideo.create({
      data: {
        id: uuidv4(), lessonId: lesson.id, title: "Video 1",
        youtubeUrl: "https://youtu.be/abcdefghijk", youtubeId: "abcdefghijk",
        providerVideoId: "abcdefghijk", providerUrl: "https://www.youtube.com/watch?v=abcdefghijk",
        duration: 100, enabled: true,
      },
    });

    const quiz = await prisma.quiz.create({
      data: { id: uuidv4(), lessonId: lesson.id, title: "Quiz 1", passingScore: 70, maxAttempts: 3, allowRetry: true },
    });

    const q1 = await prisma.quizQuestion.create({
      data: { id: uuidv4(), quizId: quiz.id, type: "MULTIPLE_CHOICE", question: "What is 2+2?", options: JSON.stringify(["3", "4", "5"]), correctAnswer: "4", displayOrder: 1 },
    });
    const q2 = await prisma.quizQuestion.create({
      data: { id: uuidv4(), quizId: quiz.id, type: "MULTIPLE_CHOICE", question: "What is 3+3?", options: JSON.stringify(["5", "6", "7"]), correctAnswer: "6", displayOrder: 2 },
    });

    lessonId = lesson.id;
    videoId = video.id;
    quizId = quiz.id;
    questionIds = [q1.id, q2.id];

    // ── Student with academic context ──
    const student = await createTestUser(prisma, { role: "STUDENT", mobileNumber: "+201077777771", password: "Test@1234" });
    studentId = student.id;
    await prisma.user.update({
      where: { id: student.id },
      data: { gradeId: grade.id, academicYearId: year.id, termId: term.id, educationalSystem: "GENERAL" },
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ identity: "+201077777771", password: "Test@1234" });
    cookies = (loginRes.headers["set-cookie"] as unknown as string[]).join("; ");
  }, 30000);

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  }, 15000);

  it("loads the lesson with its video and quiz", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lessons/${lessonId}`)
      .set("Cookie", cookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(data.id).toBe(lessonId);
    expect(data.quizEnabled).toBe(true);
    const videos = data.videos as { id: string; duration: number }[];
    expect(videos.length).toBeGreaterThan(0);
    expect(videos[0].id).toBe(videoId);
  }, 15000);

  it("starts with zero video progress", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/videos/${videoId}/progress`)
      .set("Cookie", cookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(data.lastPosition).toBe(0);
    expect(data.completed).toBe(false);
  }, 15000);

  it("rejects completing the video before watching 85%", async () => {
    // Watch only 40% of the 100s video.
    await request(app.getHttpServer())
      .patch(`/api/v1/videos/${videoId}/progress`)
      .set("Cookie", cookies)
      .send({ currentPosition: 40, watchedSeconds: 40 })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/videos/${videoId}/complete`)
      .set("Cookie", cookies)
      .expect(403);

    expect(res.body.message).toContain("watch");
  }, 15000);

  it("rejects starting the quiz before completing the video", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${lessonId}/start`)
      .set("Cookie", cookies)
      .expect(403);

    expect(res.body.message).toMatch(/complete|video/i);
  }, 15000);

  it("completes the video after watching enough and passes the quiz", async () => {
    // Watch to the end.
    const progress = await request(app.getHttpServer())
      .patch(`/api/v1/videos/${videoId}/progress`)
      .set("Cookie", cookies)
      .send({ currentPosition: 95, watchedSeconds: 95 })
      .expect(200);
    expect(progress.body.success).toBe(true);

    // Complete the video.
    const complete = await request(app.getHttpServer())
      .post(`/api/v1/videos/${videoId}/complete`)
      .set("Cookie", cookies)
      .expect(201);
    expect(complete.body.success).toBe(true);

    // The lesson progress should now be marked completed.
    const lessonProgress = await prisma.lessonProgress.findFirst({ where: { userId: studentId } });
    expect(lessonProgress?.completed).toBe(true);

    // Fetch quiz info + questions.
    const quizRes = await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${lessonId}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(quizRes.body.data.id).toBe(quizId);

    const questionsRes = await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${lessonId}/questions`)
      .set("Cookie", cookies)
      .expect(200);
    const questions = (questionsRes.body.data.questions as { id: string; type: string; question: string; options: string | null }[]);
    expect(questions.length).toBe(2);
    expect(questions.map((q) => q.id)).toEqual(expect.arrayContaining(questionIds));

    // Start an attempt.
    const start = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${lessonId}/start`)
      .set("Cookie", cookies)
      .expect(201);
    expect(start.body.data).toHaveProperty("attemptNum", 1);

    // Submit WRONG answers first.
    const fail = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${lessonId}/submit`)
      .set("Cookie", cookies)
      .send({ answers: ["3", "5"] })
      .expect(201);
    expect(fail.body.data.passed).toBe(false);
    expect(fail.body.data.score).toBe(0);

    // Result should reflect the failed attempt.
    const failResult = await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${lessonId}/result`)
      .set("Cookie", cookies)
      .expect(200);
    expect(failResult.body.data.passed).toBe(false);
    expect(failResult.body.data.score).toBe(0);

    // Retry: start a second attempt and answer CORRECTLY.
    await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${lessonId}/start`)
      .set("Cookie", cookies)
      .expect(201);

    const pass = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${lessonId}/submit`)
      .set("Cookie", cookies)
      .send({ answers: ["4", "6"] })
      .expect(201);
    expect(pass.body.data.passed).toBe(true);
    expect(pass.body.data.score).toBe(100);
    expect(pass.body.data.attemptNum).toBe(2);

    // Final result is a pass with full score.
    const passResult = await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${lessonId}/result`)
      .set("Cookie", cookies)
      .expect(200);
    expect(passResult.body.data.passed).toBe(true);
    expect(passResult.body.data.score).toBe(100);
  }, 20000);
});
