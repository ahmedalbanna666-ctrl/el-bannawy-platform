import { SessionKindResolver } from "./session-kind.resolver";
import { LiveSessionTypeEnum, LiveSubscriptionTypeEnum, LiveSessionKindEnum } from "@el-bannawy/shared";

describe("SessionKindResolver (deterministic precedence)", () => {
  let resolver: SessionKindResolver;

  beforeEach(() => {
    resolver = new SessionKindResolver();
  });

  it("GROUP session type always resolves to GROUP", () => {
    expect(
      resolver.resolve(LiveSessionTypeEnum.GROUP, [LiveSubscriptionTypeEnum.GROUP_MONTHLY]),
    ).toBe(LiveSessionKindEnum.GROUP);
    expect(resolver.resolve(LiveSessionTypeEnum.GROUP, [])).toBe(LiveSessionKindEnum.GROUP);
  });

  it("PRIVATE + PRIVATE_MONTHLY resolves to PRIVATE_MONTHLY", () => {
    expect(
      resolver.resolve(LiveSessionTypeEnum.PRIVATE, [LiveSubscriptionTypeEnum.PRIVATE_MONTHLY]),
    ).toBe(LiveSessionKindEnum.PRIVATE_MONTHLY);
  });

  it("PRIVATE + ONE_TIME_PRIVATE resolves to ONE_TIME", () => {
    expect(
      resolver.resolve(LiveSessionTypeEnum.PRIVATE, [LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE]),
    ).toBe(LiveSessionKindEnum.ONE_TIME);
  });

  it("PRIVATE without matching subscription resolves to FREE", () => {
    expect(resolver.resolve(LiveSessionTypeEnum.PRIVATE, [])).toBe(LiveSessionKindEnum.FREE);
    expect(
      resolver.resolve(LiveSessionTypeEnum.PRIVATE, [LiveSubscriptionTypeEnum.GROUP_MONTHLY]),
    ).toBe(LiveSessionKindEnum.FREE);
  });

  it("PRIVATE with both monthly and one-time prefers PRIVATE_MONTHLY (precedence)", () => {
    expect(
      resolver.resolve(LiveSessionTypeEnum.PRIVATE, [
        LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE,
        LiveSubscriptionTypeEnum.PRIVATE_MONTHLY,
      ]),
    ).toBe(LiveSessionKindEnum.PRIVATE_MONTHLY);
  });
});
