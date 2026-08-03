import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, NotificationTargetType } from "../notifications/dto/notification.dto";
import { ConfigurationService } from "../config/configuration.service";
import type { ReferralCampaign } from "@prisma/client";
import type { CreateCampaignDto, UpdateCampaignDto } from "./dto/referral.dto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_UNIT_REWARD_PERCENT = 5;
const DEFAULT_TERM_REWARD_PERCENT = 10;

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigurationService,
  ) {}

  // ── Referral codes ───────────────────────────────────────────────────

  async getOrCreateCode(userId: string): Promise<{ code: string; link: string }> {
    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) {
      return { code: existing.code, link: this.buildLink(existing.code) };
    }
    const code = await this.generateUniqueCode();
    const created = await this.prisma.referralCode.create({ data: { userId, code } });
    return { code: created.code, link: this.buildLink(created.code) };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      const bytes = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      for (let i = 0; i < 8; i++) {
        code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      }
      const existing = await this.prisma.referralCode.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new BadRequestException("Unable to generate a unique referral code, please retry");
  }

  private buildLink(code: string): string {
    return `${this.config.app.frontendUrl.replace(/\/$/, "")}/register?ref=${code}`;
  }

  // ── Student overview ─────────────────────────────────────────────────

  async getMyOverview(userId: string): Promise<unknown> {
    const { code, link } = await this.getOrCreateCode(userId);

    const [invites, stats] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        include: { referred: { select: { id: true, fullName: true, mobileNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.referral.aggregate({
        where: { referrerId: userId },
        _count: true,
        _sum: { rewardCoins: true },
      }),
    ]);

    const byStatus = new Map<string, number>();
    for (const ref of invites) {
      byStatus.set(ref.status, (byStatus.get(ref.status) ?? 0) + 1);
    }

    return {
      code,
      link,
      stats: {
        totalInvitations: stats._count,
        pending: byStatus.get("PENDING") ?? 0,
        approved: byStatus.get("APPROVED") ?? 0,
        rejected: byStatus.get("REJECTED") ?? 0,
        coinsEarned: stats._sum.rewardCoins ?? 0,
      },
      history: invites,
    };
  }

  // ── Promotional popup ────────────────────────────────────────────────

  async getPopup(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gradeId: true, assignedGrade: { select: { stageId: true } } },
    });
    if (!user) throw new NotFoundException("User not found");

    const now = new Date();
    const campaigns = await this.prisma.referralCampaign.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const stageId = user.assignedGrade?.stageId ?? null;
    const gradeId = user.gradeId;

    const matching = campaigns.filter((c) => {
      if (c.targetStageId && c.targetStageId !== stageId) return false;
      if (c.targetGradeId && c.targetGradeId !== gradeId) return false;
      return true;
    });

    const campaign = matching.length > 0 ? matching[0] : null;
    if (campaign === null) {
      return { campaign: null, shouldShow: false, code: null, link: null };
    }

    const showDays = this.parseShowDays(campaign.showDaysPerWeek);
    const todayIsActive = showDays.includes(new Date().getDay());

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const viewsToday = await this.prisma.referralCampaignView.count({
      where: { campaignId: campaign.id, userId, viewedAt: { gte: startOfToday } },
    });
    const shouldShow = todayIsActive && viewsToday < campaign.maxViewsPerDay;

    const { code, link } = await this.getOrCreateCode(userId);

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        message: campaign.message,
        unitRewardPercent: campaign.unitRewardPercent,
        termRewardPercent: campaign.termRewardPercent,
      },
      code,
      link,
      shouldShow,
    };
  }

  async recordPopupView(userId: string, campaignId: string): Promise<{ recorded: boolean }> {
    const campaign = await this.prisma.referralCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!campaign.active) throw new BadRequestException("Campaign is not active");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const viewsToday = await this.prisma.referralCampaignView.count({
      where: { campaignId, userId, viewedAt: { gte: startOfToday } },
    });

    if (viewsToday >= campaign.maxViewsPerDay) {
      return { recorded: false };
    }

    await this.prisma.referralCampaignView.create({ data: { campaignId, userId } });
    return { recorded: true };
  }

  private parseShowDays(raw: string | null): number[] {
    if (!raw) return [0, 1, 2, 3, 4, 5, 6];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((d) => typeof d === "number")) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
    return [0, 1, 2, 3, 4, 5, 6];
  }

  // ── Registration tracking ────────────────────────────────────────────

  async applyReferral(referredUserId: string, referralCode?: string): Promise<{ applied: boolean; reason?: string }> {
    const code = referralCode?.trim().toUpperCase();
    if (!code) return { applied: false, reason: "No referral code provided" };

    const referralCodeRecord = await this.prisma.referralCode.findUnique({ where: { code } });
    if (!referralCodeRecord) return { applied: false, reason: "Invalid referral code" };
    if (referralCodeRecord.userId === referredUserId) {
      return { applied: false, reason: "Self referral is not allowed" };
    }

    const referrer = await this.prisma.user.findFirst({
      where: { id: referralCodeRecord.userId, deletedAt: null },
      select: { id: true, role: true, status: true },
    });
    if (referrer?.role !== "STUDENT" || referrer.status !== "ACTIVE") {
      return { applied: false, reason: "Referral code owner is not eligible" };
    }

    const existing = await this.prisma.referral.findUnique({ where: { referredId: referredUserId } });
    if (existing) return { applied: false, reason: "Already referred" };

    const activeCampaign = await this.findActiveCampaignForReferrer();

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referredUserId,
        codeId: referralCodeRecord.id,
        campaignId: activeCampaign?.id ?? null,
        status: "PENDING",
      },
    });

    void this.notifyReferrerRegistered(referrer.id).catch(() => undefined);

    return { applied: true };
  }

  private async findActiveCampaignForReferrer(): Promise<ReferralCampaign | null> {
    const now = new Date();
    return this.prisma.referralCampaign.findFirst({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Reward granting on purchase ──────────────────────────────────────

  async handlePurchase(referredUserId: string, purchaseType: "UNIT" | "TERM", purchaseAmount: number): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { referredId: referredUserId },
      include: { campaign: true, referrer: { select: { id: true, fullName: true } } },
    });
    if (referral?.status !== "PENDING") return;

    const percent =
      purchaseType === "TERM"
        ? referral.campaign?.termRewardPercent ?? DEFAULT_TERM_REWARD_PERCENT
        : referral.campaign?.unitRewardPercent ?? DEFAULT_UNIT_REWARD_PERCENT;

    const rewardCoins = Math.max(0, Math.round((purchaseAmount * percent) / 100));

    await this.prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referral.id },
        data: {
          status: "APPROVED",
          purchasedType: purchaseType,
          purchasedAmount: purchaseAmount,
          rewardCoins,
          approvedAt: new Date(),
        },
      });

      if (rewardCoins > 0) {
        await tx.coinWallet.upsert({
          where: { userId: referral.referrerId },
          update: { balance: { increment: rewardCoins } },
          create: { userId: referral.referrerId, balance: rewardCoins },
        });
      }
    });

    if (rewardCoins > 0) {
      void this.notifyReferrerReward(referral.referrerId, rewardCoins, purchaseType).catch(() => undefined);
    }
  }

  // ── Admin: campaigns ─────────────────────────────────────────────────

  async listCampaigns(): Promise<unknown> {
    return this.prisma.referralCampaign.findMany({
      include: {
        _count: { select: { views: true, referrals: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCampaign(adminId: string, dto: CreateCampaignDto): Promise<unknown> {
    return this.prisma.referralCampaign.create({
      data: {
        title: dto.title,
        message: dto.message,
        targetStageId: dto.targetStageId ?? null,
        targetGradeId: dto.targetGradeId ?? null,
        maxViewsPerDay: dto.maxViewsPerDay ?? 1,
        showDaysPerWeek: dto.showDaysPerWeek ?? "[0,1,2,3,4,5,6]",
        unitRewardPercent: dto.unitRewardPercent ?? DEFAULT_UNIT_REWARD_PERCENT,
        termRewardPercent: dto.termRewardPercent ?? DEFAULT_TERM_REWARD_PERCENT,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdById: adminId,
      },
    });
  }

  async updateCampaign(campaignId: string, dto: UpdateCampaignDto): Promise<unknown> {
    const campaign = await this.prisma.referralCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.targetStageId !== undefined) data.targetStageId = dto.targetStageId;
    if (dto.targetGradeId !== undefined) data.targetGradeId = dto.targetGradeId;
    if (dto.maxViewsPerDay !== undefined) data.maxViewsPerDay = dto.maxViewsPerDay;
    if (dto.showDaysPerWeek !== undefined) data.showDaysPerWeek = dto.showDaysPerWeek;
    if (dto.unitRewardPercent !== undefined) data.unitRewardPercent = dto.unitRewardPercent;
    if (dto.termRewardPercent !== undefined) data.termRewardPercent = dto.termRewardPercent;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    return this.prisma.referralCampaign.update({ where: { id: campaignId }, data });
  }

  async deleteCampaign(campaignId: string): Promise<{ deleted: boolean }> {
    const campaign = await this.prisma.referralCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    await this.prisma.referralCampaign.delete({ where: { id: campaignId } });
    return { deleted: true };
  }

  // ── Admin: referrals ─────────────────────────────────────────────────

  async listReferrals(status?: string, page = 1, limit = 20): Promise<unknown> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          referrer: { select: { id: true, fullName: true, mobileNumber: true } },
          referred: { select: { id: true, fullName: true, mobileNumber: true } },
          campaign: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async getReferralStats(): Promise<unknown> {
    const [total, pending, approved, rejected, coinsEarned] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: "PENDING" } }),
      this.prisma.referral.count({ where: { status: "APPROVED" } }),
      this.prisma.referral.count({ where: { status: "REJECTED" } }),
      this.prisma.referral.aggregate({ _sum: { rewardCoins: true } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      coinsEarned: coinsEarned._sum.rewardCoins ?? 0,
      conversionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }

  async updateReferralStatus(userId: string, referralId: string, status: "APPROVED" | "REJECTED"): Promise<unknown> {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, fullName: true } },
        campaign: { select: { unitRewardPercent: true, termRewardPercent: true } },
      },
    });
    if (!referral) throw new NotFoundException("Referral not found");

    const data: Record<string, unknown> = {
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
      rejectedAt: status === "REJECTED" ? new Date() : null,
    };

    let rewardCoins = referral.rewardCoins;
    if (status === "APPROVED" && referral.rewardCoins === 0 && referral.purchasedType && referral.purchasedAmount) {
      const percent =
        referral.purchasedType === "TERM"
          ? referral.campaign?.termRewardPercent ?? DEFAULT_TERM_REWARD_PERCENT
          : referral.campaign?.unitRewardPercent ?? DEFAULT_UNIT_REWARD_PERCENT;
      rewardCoins = Math.max(0, Math.round((referral.purchasedAmount * percent) / 100));
      data.rewardCoins = rewardCoins;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.referral.update({ where: { id: referralId }, data });

      if (status === "APPROVED" && rewardCoins > 0) {
        await tx.coinWallet.upsert({
          where: { userId: referral.referrerId },
          update: { balance: { increment: rewardCoins } },
          create: { userId: referral.referrerId, balance: rewardCoins },
        });
      }
    });

    void this.notifyReferrerApproved(referral.referrerId, status).catch(() => undefined);

    return this.prisma.referral.findUnique({ where: { id: referralId } });
  }

  // ── Notifications ────────────────────────────────────────────────────

  private async notifyReferrerRegistered(referrerId: string): Promise<void> {
    await this.notifications.sendNotification(referrerId, {
      type: "referral",
      title: "صديق جديد انضم من خلالك",
      message: "مبروك! شخص جديد سجل حساب جديداً من خلال رابط الدعوة الخاص بك. عند أول اشتراك سيتم إضافة المكافأة إلى محفظتك.",
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: referrerId,
    });
  }

  private async notifyReferrerReward(referrerId: string, coins: number, purchaseType: "UNIT" | "TERM"): Promise<void> {
    const typeLabel = purchaseType === "TERM" ? "الترم" : "الوحدة";
    await this.notifications.sendNotification(referrerId, {
      type: "referral_reward",
      title: "تمت إضافة مكافأة الدعوة",
      message: `تمت إضافة ${String(coins)} عملة إلى محفظتك كمكافأة على اشتراك صديقك في ${typeLabel}.`,
      priority: NotificationPriority.HIGH,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: referrerId,
    });
  }

  private async notifyReferrerApproved(referrerId: string, status: string): Promise<void> {
    const approved = status === "APPROVED";
    await this.notifications.sendNotification(referrerId, {
      type: "referral",
      title: approved ? "تمت الموافقة على دعوتك" : "تم رفض الدعوة",
      message: approved
        ? "تمت الموافقة على إحدى دعواتك وتم تفعيل المكافأة."
        : "نعتذر، تم رفض إحدى دعواتك بعد المراجعة.",
      priority: approved ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: referrerId,
    });
  }
}
