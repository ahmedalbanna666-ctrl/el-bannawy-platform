import { BootstrapLivePolicy } from "./bootstrap-live-policy";

describe("BootstrapLivePolicy", () => {
  let policy: BootstrapLivePolicy;

  beforeEach(() => {
    policy = new BootstrapLivePolicy();
  });

  it("defaults session consumption timing to CONSUME_ON_BOOKING", () => {
    expect(policy.getSessionConsumptionTiming()).toBe("CONSUME_ON_BOOKING");
  });

  it("defaults cancellation cutoff to 24 hours", () => {
    expect(policy.getCancellationRefundPolicy().cutoffHours).toBe(24);
  });

  it("defaults refund to FULL_CREDIT before cutoff and NO_CREDIT after", () => {
    const refund = policy.getCancellationRefundPolicy();
    expect(refund.beforeCutoff).toBe("FULL_CREDIT");
    expect(refund.afterCutoff).toBe("NO_CREDIT");
    expect(refund.afterStart).toBe("NO_CREDIT");
  });

  it("defaults attendance completion threshold to 30 minutes", () => {
    expect(policy.getAttendancePolicy()).toEqual({ minCompletedMinutes: 30 });
  });
});
