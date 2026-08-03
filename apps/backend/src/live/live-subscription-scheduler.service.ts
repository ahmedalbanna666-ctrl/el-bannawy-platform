import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "../scheduler";

/** Job name emitted by the period-end repeatable scheduler. */
export const SUBSCRIPTION_PERIOD_END_JOB = "live-subscription-period-end";

/** Cron (UTC) for the daily period-end sweep: 00:05 UTC. */
const PERIOD_END_CRON = "5 0 * * *";

/**
 * LiveSubscriptionSchedulerService — drives LiveSubscriptionService.processPeriodEnd.
 *
 * Registers a BullMQ repeatable scheduler on the existing notifications queue so
 * subscriptions whose period ended are renewed (when autoRenew) or expired every
 * day. Registration is best-effort: if Redis is unavailable at boot the failure
 * is logged and the sweep simply does not run until a later deploy/boot.
 */
@Injectable()
export class LiveSubscriptionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(LiveSubscriptionSchedulerService.name);

  constructor(
    @InjectQueue(SCHEDULED_NOTIFICATIONS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.upsertJobScheduler(
        SUBSCRIPTION_PERIOD_END_JOB,
        { pattern: PERIOD_END_CRON },
        {
          name: SUBSCRIPTION_PERIOD_END_JOB,
          opts: {
            attempts: 3,
            backoff: { type: "exponential", delay: 60_000 },
          },
        },
      );
      this.logger.log(`Registered subscription period-end scheduler (cron ${PERIOD_END_CRON})`);
    } catch (error) {
      this.logger.warn(
        `Could not register subscription period-end scheduler: ${error instanceof Error ? error.message : String(error)}. The sweep will not run until Redis is reachable.`,
        "LiveSubscriptionSchedulerService",
      );
    }
  }
}
