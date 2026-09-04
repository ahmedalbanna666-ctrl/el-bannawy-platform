import { Logger, Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { BullJobQueue } from "./job-queue.service";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "./scheduler.constants";

const schedulerLogger = new Logger("SchedulerModule");

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const user = configService.get<string>("REDIS_USER", "");
        const password = configService.get<string>("REDIS_PASSWORD", "");

        // Railway Redis is provisioned but may be offline (volume-only service shows
        // ENOTFOUND redis.railway.internal). Make the connection lazy and non-retriable
        // so a missing Redis does NOT crash the entire backend — scheduled notifications
        // and subscription sweeps are degraded, everything else stays up.
        const connection: Record<string, unknown> = {
          host,
          port,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          // Return null to stop ioredis/BullMQ from spamming retries at 500 logs/sec.
          retryStrategy: () => null,
          lazyConnect: true,
          reconnectOnError: () => false,
        };
        if (user) connection.username = user;
        if (password) connection.password = password;

        schedulerLogger.log(`BullMQ connection configured for ${host}:${String(port)} (lazy)`);

        return {
          connection: connection as never,
        };
      },
    }),
    BullModule.registerQueue({ name: SCHEDULED_NOTIFICATIONS_QUEUE }),
  ],
  providers: [BullJobQueue],
  exports: [BullJobQueue, BullModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SchedulerModule {}
