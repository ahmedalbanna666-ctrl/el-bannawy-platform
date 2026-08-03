/**
 * JobQueue — port for background job scheduling.
 *
 * The domain depends on this interface, never on a concrete queue vendor.
 * BullMQ is the default backing implementation, but the seam keeps the
 * scheduler infrastructure swappable.
 */
export interface ScheduleJobOptions {
  /** Delay before the job becomes active, in milliseconds. */
  readonly delayMs?: number;
  /** Maximum number of attempts (including the first). */
  readonly attempts?: number;
  /** Backoff strategy between retries. */
  readonly backoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };
  /** Unique job id for idempotent scheduling. */
  readonly jobId?: string;
}

export interface JobQueue {
  /**
   * Schedule a named job with a payload. Returns the job id.
   * Consumers register processors for each job name.
   */
  schedule(
    queueName: string,
    jobName: string,
    payload: Record<string, unknown>,
    options?: ScheduleJobOptions,
  ): Promise<string>;
}
