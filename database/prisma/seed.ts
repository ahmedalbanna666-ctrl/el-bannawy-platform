import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Idempotent: clean existing seed data first
  await prisma.$transaction([
    prisma.assessmentAnswer.deleteMany(),
    prisma.assessmentAttempt.deleteMany(),
    prisma.assessmentQuestion.deleteMany(),
    prisma.assessmentSection.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.questionTagAssignment.deleteMany(),
    prisma.questionTag.deleteMany(),
    prisma.questionAttachment.deleteMany(),
    prisma.questionHint.deleteMany(),
    prisma.questionOption.deleteMany(),
    prisma.question.deleteMany(),
    prisma.questionGroup.deleteMany(),
    prisma.homeworkAnswer.deleteMany(),
    prisma.quizAnswer.deleteMany(),
    prisma.studentHomeworkAttempt.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.timelineEvent.deleteMany(),
    prisma.activityProgress.deleteMany(),
    prisma.activityQuestion.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.videoProgress.deleteMany(),
    prisma.lessonVocabulary.deleteMany(),
    prisma.vocabularyRelation.deleteMany(),
    prisma.vocabularySection.deleteMany(),
    prisma.homeworkQuestion.deleteMany(),
    prisma.quizQuestion.deleteMany(),
    prisma.homework.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lessonDocument.deleteMany(),
    prisma.lessonSettings.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.lessonVideo.deleteMany(),
    prisma.videoEvent.deleteMany(),
    prisma.videoQuestion.deleteMany(),
    prisma.videoQuestionOption.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.stage.deleteMany(),
    prisma.xPTransaction.deleteMany(),
    prisma.userAchievement.deleteMany(),
    prisma.userPermissionGrant.deleteMany(),
    prisma.coinWallet.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.conversationMessage.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.loginHistory.deleteMany(),
    prisma.storyChapter.deleteMany(),
    prisma.story.deleteMany(),
    prisma.finalReviewSection.deleteMany(),
    prisma.finalReview.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hashedPassword = await bcrypt.hash("Test@1234", 12);

  const teacher = await prisma.user.create({
    data: {
      fullName: "Mohamed Ali",
      email: "teacher@elbannawy.com",
      mobileNumber: "+201009876543",
      passwordHash: hashedPassword,
      role: "TEACHER",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "Admin User",
      email: "admin@elbannawy.com",
      mobileNumber: "+201005555555",
      passwordHash: hashedPassword,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      fullName: "Ahmed Albanna",
      email: "ahmed.albanna666@gmail.com",
      mobileNumber: "+201001234567",
      passwordHash: hashedPassword,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    },
  });

  const STAGE_GRADES: Record<string, string[]> = {
    ابتدائي: [
      "الصف الأول الابتدائي",
      "الصف الثاني الابتدائي",
      "الصف الثالث الابتدائي",
      "الصف الرابع الابتدائي",
      "الصف الخامس الابتدائي",
      "الصف السادس الابتدائي",
    ],
    إعدادي: ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"],
    ثانوي: ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
  };

  const stageGradeMap = new Map<string, string>();
  let stageOrder = 0;
  for (const [stageName, gradeNames] of Object.entries(STAGE_GRADES)) {
    stageOrder += 1;
    const stage = await prisma.stage.create({
      data: { id: uuidv4(), name: stageName, displayOrder: stageOrder },
    });
    let gradeOrder = 0;
    for (const gradeName of gradeNames) {
      gradeOrder += 1;
      const grade = await prisma.grade.create({
        data: { id: uuidv4(), name: gradeName, displayOrder: gradeOrder, stageId: stage.id },
      });
      if (stageName === "ابتدائي" && gradeName === "الصف الأول الابتدائي") {
        stageGradeMap.set("primaryGrade1", grade.id);
      }
    }
  }

  const seedGradeId = stageGradeMap.get("primaryGrade1")!;

  await prisma.teacherGrade.create({
    data: { userId: teacher.id, gradeId: seedGradeId },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: { name: "2025-2026" },
    create: {
      id: uuidv4(),
      name: "2025-2026",
      isActive: true,
      terms: {
        create: [
          { id: uuidv4(), name: "الترم الأول", displayOrder: 1 },
          { id: uuidv4(), name: "الترم الثاني", displayOrder: 2 },
        ],
      },
    },
    update: { isActive: true },
  });

  const terms = await prisma.term.findMany({ where: { academicYearId: academicYear.id } });
  const firstTermId = terms[0]?.id ?? null;



  await prisma.systemSetting.upsert({
    where: { key: "active_academic_year_id" },
    create: { key: "active_academic_year_id", value: academicYear.id },
    update: { value: academicYear.id },
  });
  await prisma.systemSetting.upsert({
    where: { key: "active_term_id" },
    create: { key: "active_term_id", value: firstTermId ?? "" },
    update: { value: firstTermId ?? "" },
  });

  const unit1 = await prisma.unit.create({
    data: {
      id: uuidv4(),
      title: "Getting Started",
      description: "Basic greetings and introductions",
      displayOrder: 1,
      gradeId: seedGradeId,
      academicYearId: academicYear.id,
      termId: firstTermId,
      published: true,
    },
  });

  const unit2 = await prisma.unit.create({
    data: {
      id: uuidv4(),
      title: "Everyday Conversations",
      description: "Common phrases for daily interactions",
      displayOrder: 2,
      gradeId: seedGradeId,
      academicYearId: academicYear.id,
      termId: firstTermId,
      published: true,
    },
  });

  const lesson1 = await prisma.lesson.create({
    data: {
      id: uuidv4(),
      title: "Hello and Goodbye",
      displayOrder: 1,
      estimatedDuration: 10,
      unitId: unit1.id,
      published: true,
      homeworkEnabled: true,
      quizEnabled: true,
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      id: uuidv4(),
      title: "Introducing Yourself",
      displayOrder: 2,
      estimatedDuration: 15,
      unitId: unit1.id,
      published: true,
      homeworkEnabled: false,
      quizEnabled: false,
    },
  });

  const lesson3 = await prisma.lesson.create({
    data: {
      id: uuidv4(),
      title: "Numbers 1-10",
      displayOrder: 1,
      estimatedDuration: 12,
      unitId: unit2.id,
      published: true,
      homeworkEnabled: false,
      quizEnabled: false,
    },
  });

  await prisma.lessonSettings.create({
    data: { lessonId: lesson1.id, allowRetry: true, showAnswers: true, unlockNextOnComplete: true },
  });

  const video1 = await prisma.lessonVideo.create({
    data: {
      id: uuidv4(),
      title: "Greetings Video",
      youtubeUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      providerName: "YOUTUBE",
      providerVideoId: "dQw4w9WgXcQ",
      providerUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      duration: 180,
      displayOrder: 1,
      lessonId: lesson1.id,
      enabled: true,
    },
  });

  const video2 = await prisma.lessonVideo.create({
    data: {
      id: uuidv4(),
      title: "Practice: Say Hello",
      youtubeUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      providerName: "YOUTUBE",
      providerVideoId: "dQw4w9WgXcQ",
      providerUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      duration: 120,
      displayOrder: 2,
      lessonId: lesson1.id,
      enabled: true,
    },
  });

  await prisma.timelineEvent.create({
    data: { id: uuidv4(), timestamp: 15, title: "Introduction", required: true, videoId: video1.id },
  });
  await prisma.timelineEvent.create({
    data: { id: uuidv4(), timestamp: 60, title: "Key Phrases", required: true, videoId: video1.id },
  });

  await prisma.activity.create({
    data: {
      id: uuidv4(),
      type: "MULTIPLE_CHOICE",
      title: "Greeting Match",
      config: JSON.stringify({ question: "How do you say hello?", options: ["Hello", "Goodbye", "Thanks", "Please"], correctAnswer: 0 }),
      displayOrder: 1,
      videoId: video1.id,
    },
  });

  await prisma.activity.create({
    data: {
      id: uuidv4(),
      type: "FILL_IN_BLANKS",
      title: "Complete the Greeting",
      config: JSON.stringify({ question: "___ morning! (Complete with Good)", answer: "Good" }),
      displayOrder: 2,
      videoId: video1.id,
    },
  });

  const vocabSeeds = [
    { word: "Hello", translation: "مرحبا", definition: "A greeting", example: "Hello, how are you?" },
    { word: "Goodbye", translation: "وداعا", definition: "A farewell", example: "Goodbye, see you later!" },
    { word: "Good morning", translation: "صباح الخير", definition: "Morning greeting", example: "Good morning, teacher!" },
  ];
  for (let i = 0; i < vocabSeeds.length; i++) {
    await prisma.lessonVocabulary.create({
      data: { id: uuidv4(), lessonId: lesson1.id, displayOrder: i + 1, ...vocabSeeds[i] },
    });
  }

  const homework = await prisma.homework.create({
    data: { id: uuidv4(), lessonId: lesson1.id, title: "Greetings Practice", passingScore: 70 },
  });

  await prisma.homeworkQuestion.create({
    data: {
      id: uuidv4(),
      homeworkId: homework.id,
      question: "What is the correct response to 'Hello'?",
      options: JSON.stringify(["Hello", "Goodbye", "Thanks", "Yes"]),
      correctAnswer: "0",
      displayOrder: 1,
      type: "MULTIPLE_CHOICE",
    },
  });
  await prisma.homeworkQuestion.create({
    data: {
      id: uuidv4(),
      homeworkId: homework.id,
      question: "How do you say goodbye in English?",
      options: JSON.stringify(["Hello", "Goodbye", "Please", "Sorry"]),
      correctAnswer: "1",
      displayOrder: 2,
      type: "MULTIPLE_CHOICE",
    },
  });

  const quiz = await prisma.quiz.create({
    data: { id: uuidv4(), lessonId: lesson1.id, title: "Greetings Quiz", passingScore: 70 },
  });

  await prisma.quizQuestion.create({
    data: {
      id: uuidv4(),
      quizId: quiz.id,
      question: "What does 'Goodbye' mean?",
      options: JSON.stringify(["مرحبا", "وداعا", "شكرا", "من فضلك"]),
      correctAnswer: "1",
      displayOrder: 1,
      type: "MULTIPLE_CHOICE",
    },
  });
  await prisma.quizQuestion.create({
    data: {
      id: uuidv4(),
      quizId: quiz.id,
      question: "When do you say 'Good morning'?",
      options: JSON.stringify(["In the evening", "In the morning", "At night", "In the afternoon"]),
      correctAnswer: "1",
      displayOrder: 2,
      type: "MULTIPLE_CHOICE",
    },
  });
  await prisma.quizQuestion.create({
    data: {
      id: uuidv4(),
      quizId: quiz.id,
      question: "What is the opposite of 'Hello'?",
      options: JSON.stringify(["Hi", "Goodbye", "Thanks", "Yes"]),
      correctAnswer: "1",
      displayOrder: 3,
      type: "MULTIPLE_CHOICE",
    },
  });


  console.log(`Teacher: ${teacher.fullName} (${teacher.email} / +201009876543 / Test@1234)`);
  console.log(`Admin 1: admin@elbannawy.com / Test@1234`);
  console.log(`Admin 2: ahmed.albanna666@gmail.com / Test@1234`);
  console.log("Education: 3 stages, 12 grades, 1 academic year (2 terms), 2 units, 3 lessons");
  console.log("Content: 2 videos, 2 activities, 3 vocab, 1 homework, 1 quiz");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
