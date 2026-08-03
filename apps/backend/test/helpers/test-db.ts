import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function cleanDb(...tables: string[]): Promise<void> {
  const client = getTestDb();
  if (tables.length === 0) return;
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

export async function closeTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
