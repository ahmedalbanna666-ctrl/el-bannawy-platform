import { LiveSessionKindEnum, LiveSessionTypeEnum, LiveSubscriptionTypeEnum } from "@el-bannawy/shared";

/**
 * SessionKindResolver — deterministic session-kind resolution.
 *
 * No heuristics. The kind is resolved by a fixed precedence order evaluated
 * top-down; the first match wins and the outcome is fully determined by the
 * inputs (session type + active subscription types).
 *
 * PRECEDENCE (highest first):
 *  1. session.type === GROUP                     -> GROUP
 *  2. session.type === PRIVATE + PRIVATE_MONTHLY -> PRIVATE_MONTHLY
 *  3. session.type === PRIVATE + ONE_TIME_PRIVATE-> ONE_TIME
 *  4. otherwise (PRIVATE, no matching sub)       -> FREE
 *
 * A GROUP session is always a GROUP booking. A PRIVATE session maps to the
 * highest-precedence active subscription the student holds for the teacher;
 * with no matching subscription it is FREE.
 */
export class SessionKindResolver {
  resolve(
    sessionType: LiveSessionTypeEnum,
    activeSubscriptionTypes: readonly LiveSubscriptionTypeEnum[],
  ): LiveSessionKindEnum {
    if (sessionType === LiveSessionTypeEnum.GROUP) {
      return LiveSessionKindEnum.GROUP;
    }

    if (activeSubscriptionTypes.includes(LiveSubscriptionTypeEnum.PRIVATE_MONTHLY)) {
      return LiveSessionKindEnum.PRIVATE_MONTHLY;
    }

    if (activeSubscriptionTypes.includes(LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE)) {
      return LiveSessionKindEnum.ONE_TIME;
    }

    return LiveSessionKindEnum.FREE;
  }
}
