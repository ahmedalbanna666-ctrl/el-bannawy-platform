import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { BullJobQueue } from "./job-queue.service";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "./scheduler.constants";

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

        const connection: Record<string, string | number> = { host, port };
        if (user) connection.username = user;
        if (password) connection.password = password;

        return { connection };
      },
    }),
    BullModule.registerQueue({ name: SCHEDULED_NOTIFICATIONS_QUEUE }),
  ],
  providers: [BullJobQueue],
  exports: [BullJobQueue, BullModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SchedulerModule {}
