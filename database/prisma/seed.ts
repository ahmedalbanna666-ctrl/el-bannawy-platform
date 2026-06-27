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

  await prisma.lessonProgress.create({
    data: {
      userId: student.id,
      lessonId: "lesson-1",
      completed: false,
      progress: 65,
    },
  });

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
