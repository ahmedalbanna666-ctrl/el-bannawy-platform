import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("Test@1234", 12);

  const student = await prisma.user.upsert({
    where: { mobileNumber: "+201001234567" },
    update: {},
    create: {
      fullName: "Ahmed Hassan",
      mobileNumber: "+201001234567",
      passwordHash: hashedPassword,
      role: "STUDENT",
      status: "ACTIVE",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { mobileNumber: "+201009876543" },
    update: {},
    create: {
      fullName: "Mohamed Ali",
      mobileNumber: "+201009876543",
      passwordHash: hashedPassword,
      role: "TEACHER",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { mobileNumber: "+201005555555" },
    update: {},
    create: {
      fullName: "Admin User",
      mobileNumber: "+201005555555",
      passwordHash: hashedPassword,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    },
  });

  await prisma.coinWallet.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      balance: 500,
    },
  });

  const xpSeeds = [
    { amount: 50, reason: "Completed lesson: Introduction to English" },
    { amount: 100, reason: "Quiz: Vocabulary Basics - 90% score" },
    { amount: 75, reason: "Homework: Grammar Exercise 1" },
    { amount: 200, reason: "Achievement: First Week Streak" },
    { amount: 30, reason: "Daily login bonus" },
  ];
  for (const xp of xpSeeds) {
    await prisma.xPTransaction.create({
      data: { userId: student.id, ...xp },
    });
  }

  const achievementSeeds = [
    { type: "first_lesson", title: "First Lesson", description: "Completed your first lesson", icon: "🎉" },
    { type: "week_streak", title: "Week Warrior", description: "7-day learning streak", icon: "🔥" },
    { type: "quiz_master", title: "Quiz Master", description: "Score 90%+ on 3 quizzes", icon: "🏆" },
  ];
  for (const ach of achievementSeeds) {
    await prisma.userAchievement.upsert({
      where: { userId_type: { userId: student.id, type: ach.type } },
      update: {},
      create: { userId: student.id, ...ach },
    });
  }

  // Education Domain
  const stage = await prisma.stage.upsert({
    where: { id: "stage-beginner" },
    update: {},
    create: {
      id: "stage-beginner",
      name: "Beginner",
      description: "Start your English learning journey",
      displayOrder: 1,
    },
  });

  const grade = await prisma.grade.upsert({
    where: { id: "grade-1" },
    update: {},
    create: {
      id: "grade-1",
      name: "Grade 1",
      description: "Foundational English skills",
      displayOrder: 1,
      stageId: stage.id,
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: "unit-1" },
    update: {},
    create: {
      id: "unit-1",
      title: "Getting Started",
      description: "Basic greetings and introductions",
      displayOrder: 1,
      gradeId: grade.id,
      published: true,
    },
  });

  const unit2 = await prisma.unit.upsert({
    where: { id: "unit-2" },
    update: {},
    create: {
      id: "unit-2",
      title: "Everyday Conversations",
      description: "Common phrases for daily interactions",
      displayOrder: 2,
      gradeId: grade.id,
      published: true,
    },
  });

  const lesson1 = await prisma.lesson.upsert({
    where: { id: "lesson-1" },
    update: {},
    create: {
      id: "lesson-1",
      title: "Hello and Goodbye",
      description: "Learn basic greetings and farewells",
      displayOrder: 1,
      estimatedDuration: 10,
      unitId: unit.id,
      published: true,
      homeworkEnabled: true,
      quizEnabled: true,
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { id: "lesson-2" },
    update: {},
    create: {
      id: "lesson-2",
      title: "Introducing Yourself",
      description: "Learn to introduce yourself in English",
      displayOrder: 2,
      estimatedDuration: 15,
      unitId: unit.id,
      published: true,
      homeworkEnabled: true,
      quizEnabled: true,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { id: "lesson-3" },
    update: {},
    create: {
      id: "lesson-3",
      title: "Numbers 1-10",
      description: "Learn to count from 1 to 10",
      displayOrder: 3,
      estimatedDuration: 12,
      unitId: unit.id,
      published: true,
      homeworkEnabled: true,
      quizEnabled: false,
    },
  });

  // Lesson Settings
  await prisma.lessonSettings.upsert({
    where: { lessonId: lesson1.id },
    update: {},
    create: {
      lessonId: lesson1.id,
      minScoreToPass: 70,
      allowSkipping: true,
      requiresCamera: false,
      requiresMicrophone: false,
    },
  });

  // Videos
  const video1 = await prisma.lessonVideo.upsert({
    where: { id: "video-1" },
    update: {},
    create: {
      id: "video-1",
      title: "Greetings Video",
      url: "https://example.com/videos/greetings.mp4",
      duration: 180,
      displayOrder: 1,
      lessonId: lesson1.id,
      enabled: true,
    },
  });

  const video2 = await prisma.lessonVideo.upsert({
    where: { id: "video-2" },
    update: {},
    create: {
      id: "video-2",
      title: "Practice: Say Hello",
      url: "https://example.com/videos/practice-hello.mp4",
      duration: 120,
      displayOrder: 2,
      lessonId: lesson1.id,
      enabled: true,
    },
  });

  // Timeline Events
  await prisma.timelineEvent.upsert({
    where: { id: "event-1" },
    update: {},
    create: {
      id: "event-1",
      timestamp: 15,
      title: "Introduction",
      description: "Watch the introduction to greetings",
      required: true,
      videoId: video1.id,
    },
  });

  await prisma.timelineEvent.upsert({
    where: { id: "event-2" },
    update: {},
    create: {
      id: "event-2",
      timestamp: 60,
      title: "Key Phrases",
      description: "Learn key greeting phrases",
      required: true,
      videoId: video1.id,
    },
  });

  // Activities
  await prisma.activity.upsert({
    where: { id: "activity-1" },
    update: {},
    create: {
      id: "activity-1",
      type: "MULTIPLE_CHOICE",
      title: "Greeting Match",
      config: JSON.stringify({
        question: "How do you say hello?",
        options: ["Hello", "Goodbye", "Thanks", "Please"],
        correctAnswer: 0,
      }),
      displayOrder: 1,
      videoId: video1.id,
    },
  });

  await prisma.activity.upsert({
    where: { id: "activity-2" },
    update: {},
    create: {
      id: "activity-2",
      type: "FILL_IN_BLANK",
      title: "Complete the Greeting",
      config: JSON.stringify({
        question: '___ morning! (Complete with Good)',
        answer: "Good",
      }),
      displayOrder: 2,
      videoId: video1.id,
    },
  });

  // Vocabulary
  const vocabSeeds = [
    { word: "Hello", translation: "مرحبا", definition: "A greeting", example: "Hello, how are you?", phonetic: "/həˈloʊ/", displayOrder: 1 },
    { word: "Goodbye", translation: "وداعا", definition: "A farewell", example: "Goodbye, see you later!", phonetic: "/ɡʊdˈbaɪ/", displayOrder: 2 },
    { word: "Good morning", translation: "صباح الخير", definition: "Morning greeting", example: "Good morning, teacher!", phonetic: "/ɡʊd ˈmɔːrnɪŋ/", displayOrder: 3 },
  ];
  for (const v of vocabSeeds) {
    await prisma.lessonVocabulary.upsert({
      where: { id: `vocab-${v.displayOrder}` },
      update: {},
      create: { id: `vocab-${v.displayOrder}`, lessonId: lesson1.id, ...v },
    });
  }

  // Homework
  const homework = await prisma.homework.upsert({
    where: { lessonId: lesson1.id },
    update: {},
    create: {
      id: `hw-${lesson1.id}`,
      lessonId: lesson1.id,
      title: "Greetings Practice",
      passingScore: 70,
    },
  });

  const hwQuestionSeeds = [
    { question: "What is the correct response to 'Hello'?", options: JSON.stringify(["Hello", "Goodbye", "Thanks", "Yes"]), correctAnswer: "0", displayOrder: 1 },
    { question: "How do you say goodbye in English?", options: JSON.stringify(["Hello", "Goodbye", "Please", "Sorry"]), correctAnswer: "1", displayOrder: 2 },
  ];
  for (const q of hwQuestionSeeds) {
    await prisma.homeworkQuestion.upsert({
      where: { id: `hwq-${lesson1.id}-${q.displayOrder}` },
      update: {},
      create: { id: `hwq-${lesson1.id}-${q.displayOrder}`, homeworkId: homework.id, ...q },
    });
  }

  // Quiz
  const quiz = await prisma.quiz.upsert({
    where: { lessonId: lesson1.id },
    update: {},
    create: {
      id: `quiz-${lesson1.id}`,
      lessonId: lesson1.id,
      title: "Greetings Quiz",
      passingScore: 70,
    },
  });

  const quizQuestionSeeds = [
    { question: "What does 'Goodbye' mean?", options: JSON.stringify(["مرحبا", "وداعا", "شكرا", "من فضلك"]), correctAnswer: "1", displayOrder: 1 },
    { question: "When do you say 'Good morning'?", options: JSON.stringify(["In the evening", "In the morning", "At night", "In the afternoon"]), correctAnswer: "1", displayOrder: 2 },
    { question: "What is the opposite of 'Hello'?", options: JSON.stringify(["Hi", "Goodbye", "Thanks", "Yes"]), correctAnswer: "1", displayOrder: 3 },
  ];
  for (const q of quizQuestionSeeds) {
    await prisma.quizQuestion.upsert({
      where: { id: `quizq-${lesson1.id}-${q.displayOrder}` },
      update: {},
      create: { id: `quizq-${lesson1.id}-${q.displayOrder}`, quizId: quiz.id, ...q },
    });
  }

  // Lesson Progress
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: student.id, lessonId: lesson1.id } },
    update: {},
    create: {
      userId: student.id,
      lessonId: lesson1.id,
      completed: false,
      progress: 65,
    },
  });

  // Login History & Attendance
  await prisma.loginHistory.create({
    data: {
      userId: student.id,
      ipAddress: "127.0.0.1",
      success: true,
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      userId: student.id,
      present: true,
    },
  });

  console.log(`✅ Created student: ${student.fullName} (+201001234567 / Test@1234)`);
  console.log(`✅ Created teacher: ${teacher.fullName} (+201009876543 / Test@1234)`);
  console.log(`✅ Created admin: ${admin.fullName} (+201005555555 / Test@1234)`);
  console.log("✅ Created education domain: 1 stage, 1 grade, 2 units, 3 lessons");
  console.log("✅ Created 2 videos, 2 timeline events, 2 activities, 3 vocabulary words");
  console.log("✅ Created 1 homework, 2 homework questions, 1 quiz, 3 quiz questions");
  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
