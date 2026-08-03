import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  LiveSubscriptionStatusEnum,
  LiveSubscriptionTypeEnum,
  LiveSessionKindEnum,
} from "@el-bannawy/shared";
import type { Prisma, $Enums } from "@prisma/client";
import {
  LIVE_DOMAIN_EVENT_BUS,
  type LiveDomainEventBus,
  LIVE_SUBSCRIPTION_EVENTS,
} from "./events";

const MONTHLY_TYPES: ReadonlySet<string> = new Set([
  LiveSubscriptionTypeEnum.PRIVATE_MONTHLY,
  LiveSubscriptionTypeEnum.GROUP_MONTHLY,
]);

/**
 * LiveSubscriptionService — the single owner of the subscription domain.
 *
 * No other service may mutate subscription state (`sessionsUsed`, `status`,
 * periods) or make entitlement decisions directly. Everything goes through
 * this service:
 *
 *  - consume / creditBack      → session counter mutations
 *  - remaining / eligibility   → entitlement & remaining queries
 *  - exhausted                 → capacity check
 *  - renewal / expire          → period lifecycle
 *
 * State transitions emit typed domain events through LiveDomainEventBus so
 * side effects (notifications, analytics) subscribe instead of reaching into
 * subscription state.
 */
@Injectable()
export class LiveSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async getSubscriptions(userId: string, teacherId?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = { userId, deletedAt: null };
    if (teacherId) where.teacherId = teacherId;
    return this.prisma.liveSubscription.findMany({
      where,
      take: 100,
      include: { teacher: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createSubscription(
    userId: string,
    dto: { teacherId: string; type: string },
  ): Promise<unknown> {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException("Teacher not found");
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    const isGroup = dto.type.includes("GROUP");
    const count = isGroup ? 8 : 4;
    const created = await this.prisma.liveSubscription.create({
      data: {
        userId,
        teacherId: dto.teacherId,
        type: dto.type as $Enums.LiveSubscriptionType,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        packageLabel: isGroup ? "GROUP" : "PRIVATE",
        packageSessionCount: count,
        sessionsTotal: count,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        nextBillingDate: end,
        autoRenew: true,
      },
      include: { teacher: { select: { id: true, fullName: true, email: true } } },
    });

    await this.events.publish({
      type: LIVE_SUBSCRIPTION_EVENTS.CREATED,
      aggregateId: created.id,
      occurredAt: new Date(),
      payload: {
        subscriptionId: created.id,
        userId,
        teacherId: dto.teacherId,
        type: dto.type,
        sessionsTotal: count,
        periodEnd: end,
      },
    });

    return created;
  }

  async updateSubscription(
    id: string,
    userId: string,
    role: string,
    dto: { type?: string; status?: string; isActive?: boolean },
  ): Promise<unknown> {
    const sub = await this.prisma.liveSubscription.findFirst({
      where: { id, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    if (role !== "ADMINISTRATOR" && sub.userId !== userId) {
      throw new ForbiddenException("Not your subscription");
    }
    const data: Record<string, unknown> = {};
    if (dto.type) data.type = dto.type;
    let targetStatus: LiveSubscriptionStatusEnum | undefined;
    if (dto.status) {
      targetStatus = dto.status as LiveSubscriptionStatusEnum;
      data.status = dto.status;
    }
    if (dto.isActive !== undefined) {
      targetStatus = dto.isActive
        ? LiveSubscriptionStatusEnum.ACTIVE
        : LiveSubscriptionStatusEnum.CANCELLED;
      data.status = targetStatus;
    }
    const updated = await this.prisma.liveSubscription.update({ where: { id }, data });

    if (targetStatus && targetStatus !== (sub.status as LiveSubscriptionStatusEnum)) {
      await this.events.publish({
        type: LIVE_SUBSCRIPTION_EVENTS.STATUS_CHANGED,
        aggregateId: id,
        occurredAt: new Date(),
        payload: {
          subscriptionId: id,
          userId: sub.userId,
          from: sub.status,
          to: targetStatus,
        },
      });
    }
    return updated;
  }

  // ── Entitlement queries ─────────────────────────────────────────────────

  async hasActiveSubscription(userId: string, teacherId: string): Promise<boolean> {
    const now = new Date();
    const sub = await this.prisma.liveSubscription.findFirst({
      where: {
        userId,
        teacherId,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { id: true },
    });
    return Boolean(sub);
  }

  /** Whether the user holds at least one active, non-expired subscription for the given teacher. */
  async hasAnyActiveSubscription(userId: string, teacherId: string): Promise<boolean> {
    const now = new Date();
    const sub = await this.prisma.liveSubscription.findFirst({
      where: {
        userId,
        teacherId,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { id: true },
    });
    return Boolean(sub);
  }

  /** User IDs with an active subscription for a teacher (subscriber notifications). */
  async getActiveSubscriberUserIds(teacherId: string): Promise<string[]> {
    const now = new Date();
    const subs = await this.prisma.liveSubscription.findMany({
      where: {
        teacherId,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { userId: true },
    });
    return [...new Set(subs.map((s) => s.userId))];
  }

  /**
   * Active subscription types a student holds for a teacher (non-expired).
   */
  async getActiveTypesForTeacher(userId: string, teacherId: string): Promise<LiveSubscriptionTypeEnum[]> {
    const now = new Date();
    const subs = await this.prisma.liveSubscription.findMany({
      where: {
        userId,
        teacherId,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { type: true },
    });
    return subs.map((s) => s.type as LiveSubscriptionTypeEnum);
  }

  /**
   * Transaction variant of getActiveTypesForTeacher (used inside the booking
   * engine transaction so reads are consistent with the reservation).
   */
  async getActiveTypesForTeacherTx(
    tx: Prisma.TransactionClient,
    userId: string,
    teacherId: string,
  ): Promise<LiveSubscriptionTypeEnum[]> {
    const now = new Date();
    const subs = await tx.liveSubscription.findMany({
      where: {
        userId,
        teacherId,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { type: true },
    });
    return subs.map((s) => s.type as LiveSubscriptionTypeEnum);
  }

  /** Remaining sessions for a subscription. */
  async getRemaining(subscriptionId: string): Promise<{ remaining: number; total: number; used: number }> {
    const sub = await this.prisma.liveSubscription.findUnique({
      where: { id: subscriptionId },
      select: { sessionsTotal: true, sessionsUsed: true },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    return {
      total: sub.sessionsTotal,
      used: sub.sessionsUsed,
      remaining: Math.max(0, sub.sessionsTotal - sub.sessionsUsed),
    };
  }

  /** Remaining sessions aggregated across active subscriptions of a kind. */
  async getRemainingByKind(
    userId: string,
    teacherId: string,
    kind: LiveSessionKindEnum,
  ): Promise<{ remaining: number; total: number; used: number }> {
    const type = this.kindToType(kind);
    const now = new Date();
    const subs = await this.prisma.liveSubscription.findMany({
      where: {
        userId,
        teacherId,
        type,
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { gte: now },
      },
      select: { sessionsTotal: true, sessionsUsed: true },
    });
    const total = subs.reduce((acc, s) => acc + s.sessionsTotal, 0);
    const used = subs.reduce((acc, s) => acc + s.sessionsUsed, 0);
    return { total, used, remaining: Math.max(0, total - used) };
  }

  /**
   * Eligibility — whether the student can consume a session of this kind.
   * A FREE session is always eligible; otherwise an active subscription of the
   * matching type must exist with at least one remaining session.
   */
  async isEligible(userId: string, teacherId: string, kind: LiveSessionKindEnum): Promise<boolean> {
    if (kind === LiveSessionKindEnum.FREE) return true;
    const remaining = await this.getRemainingByKind(userId, teacherId, kind);
    return remaining.remaining > 0;
  }

  /**
   * Exhausted — whether the student has an active subscription of this kind
   * but zero remaining sessions (triggers top-up/plan CTA).
   */
  async isExhausted(userId: string, teacherId: string, kind: LiveSessionKindEnum): Promise<boolean> {
    if (kind === LiveSessionKindEnum.FREE) return false;
    const remaining = await this.getRemainingByKind(userId, teacherId, kind);
    return remaining.total > 0 && remaining.remaining === 0;
  }

  // ── Session counter mutations (single owner) ────────────────────────────

  /**
   * Consume one session against a subscription inside the caller's transaction.
   * No-op when the subscription is not ACTIVE. Emits CONSUMED (and EXHAUSTED
   * when the counter reaches the total) after the write.
   */
  async consume(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    context?: { sessionId?: string },
  ): Promise<boolean> {
    const result = await tx.liveSubscription.updateMany({
      where: { id: subscriptionId, status: LiveSubscriptionStatusEnum.ACTIVE },
      data: { sessionsUsed: { increment: 1 } },
    });
    if (result.count === 0) return false;

    const sub = await tx.liveSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, userId: true, sessionsTotal: true, sessionsUsed: true },
    });
    if (!sub) return true;

    const remaining = Math.max(0, sub.sessionsTotal - sub.sessionsUsed);
    await this.events.publish({
      type: LIVE_SUBSCRIPTION_EVENTS.CONSUMED,
      aggregateId: subscriptionId,
      occurredAt: new Date(),
      payload: {
        subscriptionId,
        userId: sub.userId,
        sessionId: context?.sessionId,
        used: sub.sessionsUsed,
        total: sub.sessionsTotal,
        remaining,
      },
    });

    if (remaining === 0) {
      await this.events.publish({
        type: LIVE_SUBSCRIPTION_EVENTS.EXHAUSTED,
        aggregateId: subscriptionId,
        occurredAt: new Date(),
        payload: {
          subscriptionId,
          userId: sub.userId,
          total: sub.sessionsTotal,
        },
      });
    }
    return true;
  }

  /** Credit back one session (refund/cancel). Never below zero. */
  async creditBack(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    context?: { sessionId?: string },
  ): Promise<void> {
    const sub = await tx.liveSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, userId: true, sessionsTotal: true, sessionsUsed: true },
    });
    if (!sub || sub.sessionsUsed <= 0) return;
    await tx.liveSubscription.update({
      where: { id: subscriptionId },
      data: { sessionsUsed: { decrement: 1 } },
    });
    const remaining = Math.max(0, sub.sessionsTotal - (sub.sessionsUsed - 1));
    await this.events.publish({
      type: LIVE_SUBSCRIPTION_EVENTS.CREDITED_BACK,
      aggregateId: subscriptionId,
      occurredAt: new Date(),
      payload: {
        subscriptionId,
        userId: sub.userId,
        sessionId: context?.sessionId,
        used: sub.sessionsUsed - 1,
        total: sub.sessionsTotal,
        remaining,
      },
    });
  }

  // ── Period lifecycle: renewal & expiry (single owner) ───────────────────

  /**
   * Renew a monthly subscription: advance the period by one billing cycle and
   * reset the used-session counter. Only PRIVATE_MONTHLY / GROUP_MONTHLY are
   * renewable. Emits RENEWED.
   */
  async renew(subscriptionId: string): Promise<unknown> {
    const sub = await this.prisma.liveSubscription.findFirst({
      where: { id: subscriptionId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    if (!MONTHLY_TYPES.has(sub.type)) {
      throw new BadRequestException("Only monthly subscriptions can be renewed");
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updated = await this.prisma.liveSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: LiveSubscriptionStatusEnum.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        sessionsUsed: 0,
        cancelledAt: null,
        cancelReason: null,
        suspendedAt: null,
      },
    });

    await this.events.publish({
      type: LIVE_SUBSCRIPTION_EVENTS.RENEWED,
      aggregateId: subscriptionId,
      occurredAt: new Date(),
      payload: {
        subscriptionId,
        userId: sub.userId,
        type: sub.type,
        periodStart,
        periodEnd,
      },
    });
    return updated;
  }

  /** Expire a subscription (non-renewal or failed billing). Emits EXPIRED. */
  async expire(subscriptionId: string): Promise<unknown> {
    const sub = await this.prisma.liveSubscription.findFirst({
      where: { id: subscriptionId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    const currentStatus = sub.status as LiveSubscriptionStatusEnum;
    if (currentStatus === LiveSubscriptionStatusEnum.EXPIRED) return sub;

    const updated = await this.prisma.liveSubscription.update({
      where: { id: subscriptionId },
      data: { status: LiveSubscriptionStatusEnum.EXPIRED },
    });
    await this.events.publish({
      type: LIVE_SUBSCRIPTION_EVENTS.EXPIRED,
      aggregateId: subscriptionId,
      occurredAt: new Date(),
      payload: { subscriptionId, userId: sub.userId },
    });
    return updated;
  }

  /**
   * Process all subscriptions whose period has ended: renew when autoRenew is
   * on, otherwise expire. Returns { renewed, expired } counts. Designed to be
   * driven by the scheduler job later; safe to call manually.
   */
  async processPeriodEnd(now: Date = new Date()): Promise<{ renewed: number; expired: number }> {
    const due = await this.prisma.liveSubscription.findMany({
      where: {
        status: LiveSubscriptionStatusEnum.ACTIVE,
        deletedAt: null,
        currentPeriodEnd: { lt: now },
      },
      select: { id: true, autoRenew: true, type: true },
    });

    let renewed = 0;
    let expired = 0;
    for (const sub of due) {
      if (sub.autoRenew && MONTHLY_TYPES.has(sub.type)) {
        await this.renew(sub.id);
        renewed++;
      } else {
        await this.expire(sub.id);
        expired++;
      }
    }
    return { renewed, expired };
  }

  private kindToType(kind: LiveSessionKindEnum): LiveSubscriptionTypeEnum {
    switch (kind) {
      case LiveSessionKindEnum.PRIVATE_MONTHLY:
        return LiveSubscriptionTypeEnum.PRIVATE_MONTHLY;
      case LiveSessionKindEnum.GROUP:
        return LiveSubscriptionTypeEnum.GROUP_MONTHLY;
      case LiveSessionKindEnum.ONE_TIME:
        return LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE;
      case LiveSessionKindEnum.FREE:
        throw new BadRequestException("FREE sessions have no subscription type");
    }
  }
}
