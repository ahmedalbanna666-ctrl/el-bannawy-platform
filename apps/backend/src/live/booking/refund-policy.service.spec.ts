import { Test, type TestingModule } from "@nestjs/testing";
import { RefundPolicyService } from "./refund-policy.service";
import { LIVE_POLICY_ENGINE, type LivePolicyEngine } from "../policy";

const HOUR_MS = 60 * 60 * 1000;

describe("RefundPolicyService", () => {
  let service: RefundPolicyService;
  const policy: LivePolicyEngine = {
    getSessionConsumptionTiming: () => "CONSUME_ON_BOOKING",
    getCancellationRefundPolicy: () => ({
      cutoffHours: 24,
      beforeCutoff: "FULL_CREDIT",
      afterCutoff: "NO_CREDIT",
      afterStart: "NO_CREDIT",
    }),
    getAttendancePolicy: () => ({ minCompletedMinutes: 30 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefundPolicyService, { provide: LIVE_POLICY_ENGINE, useValue: policy }],
    }).compile();
    service = module.get<RefundPolicyService>(RefundPolicyService);
  });

  const start = new Date("2026-08-10T10:00:00Z");

  it("grants full credit before the cutoff", () => {
    const now = new Date(start.getTime() - 48 * HOUR_MS);
    expect(service.isRefundEligible(start, now)).toBe(true);
  });

  it("denies credit inside the cutoff window", () => {
    const now = new Date(start.getTime() - 12 * HOUR_MS);
    expect(service.isRefundEligible(start, now)).toBe(false);
  });

  it("denies credit after the session started", () => {
    const now = new Date(start.getTime() + HOUR_MS);
    expect(service.isRefundEligible(start, now)).toBe(false);
  });
});
