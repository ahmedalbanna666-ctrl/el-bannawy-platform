import { Inject, Injectable } from "@nestjs/common";
import { LIVE_POLICY_ENGINE, type LivePolicyEngine } from "../policy";

const HOUR_MS = 60 * 60 * 1000;

/**
 * RefundPolicyService — sole evaluator of cancellation refund eligibility.
 *
 * The policy decides the credit level for three windows relative to the
 * session start: before the cutoff, inside the cutoff, and after start.
 * BookingEngine never computes refund eligibility itself.
 */
@Injectable()
export class RefundPolicyService {
  constructor(@Inject(LIVE_POLICY_ENGINE) private readonly policy: LivePolicyEngine) {}

  /** Whether a cancellation at `now` is refund-eligible for a session. */
  isRefundEligible(sessionStartTime: Date, now: Date): boolean {
    const policy = this.policy.getCancellationRefundPolicy();
    const cutoffAt = new Date(sessionStartTime.getTime() - policy.cutoffHours * HOUR_MS);

    if (now >= sessionStartTime) {
      return policy.afterStart === "FULL_CREDIT";
    }
    if (now >= cutoffAt) {
      return policy.afterCutoff === "FULL_CREDIT";
    }
    return policy.beforeCutoff === "FULL_CREDIT";
  }
}
