import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const configs = await prisma.aiModelConfig.findMany({
    orderBy: { priority: "asc" },
    select: {
      id: true,
      provider: true,
      modelName: true,
      isActive: true,
      isEnabled: true,
      supportsStreaming: true,
      priority: true,
      baseUrl: true,
      timeout: true,
      maxTokens: true,
      healthStatus: true,
      lastError: true,
      updatedAt: true,
    },
  });
  console.log(JSON.stringify(configs, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
