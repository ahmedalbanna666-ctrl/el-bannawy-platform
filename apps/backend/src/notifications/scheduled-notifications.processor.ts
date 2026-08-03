import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "../scheduler";
import { NotificationsService, DISPATCH_SCHEDULED_JOB } from "./notifications.service";

/**
 * ScheduledNotificationsProcessor — BullMQ worker that dispatches scheduled
 * notifications when their delayed job fires.
 *
 * The delayed job carries { type, channel, scheduledAt }; rows whose
 * scheduledAt <= job time and sentAt IS NULL are dispatched and marked sent.
 */
@Processor(SCHEDULED_NOTIFICATIONS_QUEUE)
export class ScheduledNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledNotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<{ type?: string; channel?: string; scheduledAt: string }>): Promise<unknown> {
    if (job.name !== DISPATCH_SCHEDULED_JOB) {
      return { skipped: true };
    }

    const scheduledAt = new Date(job.data.scheduledAt);
    const result = await this.notifications.dispatchScheduled(
      scheduledAt,
      job.data.type,
      job.data.channel,
    );

    this.logger.debug(`Dispatched ${String(result.dispatched)} scheduled notification(s)`);
    return result;
  }
}
