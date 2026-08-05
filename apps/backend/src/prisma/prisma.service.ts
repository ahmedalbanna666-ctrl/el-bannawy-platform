import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      transactionOptions: {
        maxWait: 10000,
        timeout: 30000,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        const attemptStr = String(attempt);
        const maxRetriesStr = String(MAX_RETRIES);
        Logger.error(
          `Database connection attempt ${attemptStr}/${maxRetriesStr} failed: ${error instanceof Error ? error.message : String(error)}`,
          "PrismaService",
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        } else {
          throw error;
        }
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
