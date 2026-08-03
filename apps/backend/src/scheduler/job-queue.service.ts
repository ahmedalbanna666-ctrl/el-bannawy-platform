import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { JobQueue, ScheduleJobOptions } from "./scheduler.interface";
import { SCHEDULED_NOTIFICATIONS_QUEUE } from "./scheduler.constants";

/**
 * BullJobQueue — BullMQ-backed implementation of the JobQueue port.
 *
 * Queues are registered by name in the SchedulerModule. This service exposes
 * the scheduling seam; actual job processors (e.g. reminder workers) are
 * registered per queue name.
 */
@Injectable()
export class BullJobQueue implements JobQueue {
  private readonly logger = new Logger(BullJobQueue.name);

  constructor(
    @InjectQueue(SCHEDULED_NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
  ) {}

  private resolveQueue(queueName: string): Queue {
    switch (queueName) {
      case SCHEDULED_NOTIFICATIONS_QUEUE:
        return this.notificationsQueue;
      default:
        throw new Error(`Unknown queue "${queueName}"`);
    }
  }

  async schedule(
    queueName: string,
    jobName: string,
    payload: Record<string, unknown>,
    options: ScheduleJobOptions = {},
  ): Promise<string> {
    const queue = this.resolveQueue(queueName);
    const job = await queue.add(
      jobName,
      payload,
      {
        delay: options.delayMs,
        attempts: options.attempts ?? 1,
        backoff: options.backoff,
        jobId: options.jobId,
      },
    );
    this.logger.debug(`Scheduled job "${jobName}" on "${queueName}" (id=${String(job.id)})`);
    return job.id ?? "";
  }
}
