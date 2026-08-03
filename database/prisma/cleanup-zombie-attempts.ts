import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, email: true },
  });

  for (const student of students) {
    // Quiz zombies: unsubmitted attempts with no recorded answers.
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: student.id, submitted: false },
      include: { _count: { select: { answers: true } } },
    });
    let quizRemoved = 0;
    for (const a of quizAttempts) {
      if (a._count.answers === 0) {
        await prisma.quizAttempt.delete({ where: { id: a.id } });
        quizRemoved += 1;
      }
    }

    // Homework zombies: unsubmitted attempts with no recorded answers.
    const hwAttempts = await prisma.studentHomeworkAttempt.findMany({
      where: { userId: student.id, submitted: false },
      include: { _count: { select: { answers: true } } },
    });
    let hwRemoved = 0;
    for (const a of hwAttempts) {
      if (a._count.answers === 0) {
        await prisma.studentHomeworkAttempt.delete({ where: { id: a.id } });
        hwRemoved += 1;
      }
    }

    if (quizRemoved > 0 || hwRemoved > 0) {
      console.log(`${student.email}: removed ${quizRemoved} quiz zombies, ${hwRemoved} homework zombies`);
    }
  }

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
