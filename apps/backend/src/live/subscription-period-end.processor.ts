import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "../scheduler";
import { LiveSubscriptionService } from "./live-subscription.service";
import { SUBSCRIPTION_PERIOD_END_JOB } from "./live-subscription-scheduler.service";

/**
 * SubscriptionPeriodEndProcessor — BullMQ worker handling the daily
 * subscription period-end sweep. Lives on the shared notifications queue but
 * only reacts to its own job name (other jobs are skipped).
 */
@Processor(SCHEDULED_NOTIFICATIONS_QUEUE)
export class SubscriptionPeriodEndProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionPeriodEndProcessor.name);

  constructor(private readonly subscriptions: LiveSubscriptionService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== SUBSCRIPTION_PERIOD_END_JOB) {
      return { skipped: true };
    }

    const result = await this.subscriptions.processPeriodEnd();
    this.logger.log(
      `Subscription period-end sweep: renewed=${String(result.renewed)} expired=${String(result.expired)}`,
    );
    return result;
  }
}
