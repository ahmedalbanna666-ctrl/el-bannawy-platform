import { Injectable } from "@nestjs/common";
import type {
  LiveAttendancePolicy,
  LiveCancellationRefundPolicy,
  LivePolicyEngine,
  LiveSessionConsumptionTiming,
} from "./live-policy.interface";

/**
 * BootstrapLivePolicy — temporary bootstrap defaults for live-class policies.
 *
 * These values are the single source of truth until a persisted policy store
 * replaces this implementation. Business logic never reads them directly; it
 * only consumes the LivePolicyEngine interface.
 *
 * Approved temporary defaults (FPCS pending):
 *  - Session consumption timing: CONSUME_ON_BOOKING
 *  - Cancellation cutoff: 24 hours before session start
 *  - Refund policy:
 *      before cutoff  -> FULL_CREDIT
 *      after cutoff   -> NO_CREDIT
 *      after start    -> NO_CREDIT
 *  - Attendance: attendance lasting at least 30 minutes is COMPLETED,
 *      anything shorter is LEFT_EARLY.
 */
@Injectable()
export class BootstrapLivePolicy implements LivePolicyEngine {
  getSessionConsumptionTiming(): LiveSessionConsumptionTiming {
    return "CONSUME_ON_BOOKING";
  }

  getCancellationRefundPolicy(): LiveCancellationRefundPolicy {
    return {
      cutoffHours: 24,
      beforeCutoff: "FULL_CREDIT",
      afterCutoff: "NO_CREDIT",
      afterStart: "NO_CREDIT",
    };
  }

  getAttendancePolicy(): LiveAttendancePolicy {
    return { minCompletedMinutes: 30 };
  }
}
