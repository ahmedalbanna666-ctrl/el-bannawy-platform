import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/services/cache.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { ReferralService } from "../referral/referral.service";

const UNLOCK_TYPES = ["UNIT", "TERM"] as const;
type UnlockType = (typeof UNLOCK_TYPES)[number];

const UNIT_COST_KEY = "unit_unlock_cost";
const TERM_COST_KEY = "term_unlock_cost";

@Injectable()
export class CoinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly academicContext: AcademicContextService,
    private readonly referralService: ReferralService,
  ) {}

  async listPackages(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");
    const where = user.role === "ADMINISTRATOR" ? {} : { active: true };
    return this.prisma.coinPackage.findMany({
      where,
      orderBy: { price: "asc" },
    });
  }

  async createPackage(dto: { name: string; description?: string; coinAmount: number; price: number }): Promise<unknown> {
    return this.prisma.coinPackage.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        coinAmount: dto.coinAmount,
        price: dto.price,
        active: true,
      },
    });
  }

  async updatePackage(id: string, dto: Partial<{ name: string; description: string; coinAmount: number; price: number; active: boolean }>): Promise<unknown> {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException("Package not found");
    return this.prisma.coinPackage.update({ where: { id }, data: { ...dto } });
  }

  async deletePackage(id: string): Promise<void> {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException("Package not found");
    await this.prisma.coinPackage.delete({ where: { id } });
  }

  async getWallet(userId: string): Promise<unknown> {
    const wallet = await this.prisma.coinWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });
    return wallet;
  }

  async purchasePackage(userId: string, dto: { packageId: string; paymentMethod: string }): Promise<{ checkoutId: string; paymentUrl: string; amount: number; paymentId: string }> {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException("Package not found");
    if (!pkg.active) throw new BadRequestException("Package is not available");

    const checkoutId = randomUUID();
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        productType: "COIN_PACKAGE",
        productId: pkg.id,
        amount: pkg.price,
        currency: "EGP",
        paymentMethod: dto.paymentMethod,
        status: "PENDING",
        gatewayRef: checkoutId,
      },
    });

    await this.prisma.coinPurchase.create({
      data: {
        userId,
        packageId: pkg.id,
        coinAmount: pkg.coinAmount,
        price: pkg.price,
        paymentId: payment.id,
        status: "PENDING",
      },
    });

    return {
      checkoutId,
      paymentUrl: `/payments/checkout/${checkoutId}`,
      amount: pkg.price,
      paymentId: payment.id,
    };
  }

  async verifyPurchase(userId: string, dto: { checkoutId: string; paymentMethod?: string; gatewayRef?: string; rawPayload?: Record<string, unknown> }): Promise<{ verified: boolean; status: string; coinsAdded: number }> {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: dto.checkoutId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "COMPLETED") {
      return { verified: true, status: "COMPLETED", coinsAdded: 0 };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", gatewayResponse: dto.rawPayload ? JSON.stringify(dto.rawPayload) : null },
    });

    const purchase = await this.prisma.coinPurchase.findFirst({
      where: { paymentId: payment.id },
    });

    if (purchase && purchase.status !== "COMPLETED") {
      await this.prisma.coinPurchase.update({
        where: { id: purchase.id },
        data: { status: "COMPLETED" },
      });
      await this.creditWallet(purchase.userId, purchase.coinAmount);
      await this.invalidateDashboardCache(purchase.userId);
      return { verified: true, status: "COMPLETED", coinsAdded: purchase.coinAmount };
    }

    return { verified: true, status: "COMPLETED", coinsAdded: 0 };
  }

  async getUnlockCost(targetType: string): Promise<{ cost: number }> {
    const key = targetType === "UNIT" ? UNIT_COST_KEY : targetType === "TERM" ? TERM_COST_KEY : null;
    if (!key) return { cost: 0 };
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return { cost: setting ? Number(setting.value) : targetType === "UNIT" ? 50 : 300 };
  }

  async getEffectiveTermCost(userId: string, termId: string): Promise<{ cost: number; baseCost: number; credit: number }> {
    const { cost: baseCost } = await this.getUnlockCost("TERM");
    const units = await this.prisma.unit.findMany({ where: { termId }, select: { id: true } });
    if (units.length === 0) return { cost: baseCost, baseCost, credit: 0 };
    const unlocks = await this.prisma.contentUnlock.findMany({
      where: { userId, targetType: "UNIT", targetId: { in: units.map((u) => u.id) } },
      select: { coinAmount: true },
    });
    const paid = unlocks.reduce((sum, u) => sum + (u.coinAmount ?? 0), 0);
    const credit = Math.min(paid, baseCost);
    return { cost: Math.max(0, baseCost - paid), baseCost, credit };
  }

  async setUnlockCost(userId: string, dto: { targetType: string; cost: number }): Promise<{ cost: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || (user.role !== "ADMINISTRATOR" && user.role !== "TEACHER")) {
      throw new ForbiddenException("Only administrators and teachers can set unlock costs");
    }
    const key = dto.targetType === "UNIT" ? UNIT_COST_KEY : dto.targetType === "TERM" ? TERM_COST_KEY : null;
    if (!key) throw new BadRequestException("Invalid target type");
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(dto.cost) },
      create: { key, value: String(dto.cost) },
    });
    return { cost: dto.cost };
  }

  async listCodes(_userId: string, page = 1, limit = 20): Promise<{ data: unknown[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.unlockCode.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { redemptions: true } } },
        skip,
        take,
      }),
      this.prisma.unlockCode.count(),
    ]);
    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async createCode(userId: string, dto: { code?: string; coinAmount: number; maxUses?: number; expiresAt?: string; targetType?: string; targetId?: string }): Promise<unknown> {
    const code = dto.code?.trim() ? dto.code.trim() : randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const existing = await this.prisma.unlockCode.findUnique({ where: { code } });
    if (existing) throw new BadRequestException("Code already exists");
    return this.prisma.unlockCode.create({
      data: {
        code,
        coinAmount: dto.coinAmount,
        maxUses: dto.maxUses ?? null,
        active: true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        targetType: dto.targetType ?? null,
        targetId: dto.targetId ?? null,
        createdById: userId,
      },
    });
  }

  async toggleCode(userId: string, id: string): Promise<unknown> {
    const code = await this.prisma.unlockCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException("Code not found");
    return this.prisma.unlockCode.update({ where: { id }, data: { active: !code.active } });
  }

  async removeCode(id: string): Promise<{ deleted: boolean }> {
    const code = await this.prisma.unlockCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException("Code not found");
    await this.prisma.$transaction(async (tx) => {
      await tx.codeRedemption.deleteMany({ where: { codeId: id } });
      await tx.unlockCode.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async redeemCode(userId: string, codeStr: string): Promise<{ coinsAdded: number; unlocked: boolean }> {
    const code = await this.prisma.unlockCode.findFirst({ where: { code: codeStr.trim().toUpperCase() } });
    if (!code) throw new NotFoundException("Invalid activation code");
    if (!code.active) throw new BadRequestException("Code is disabled");
    if (code.expiresAt && code.expiresAt < new Date()) throw new BadRequestException("Code has expired");

    const isContentCode = !!(code.targetType && code.targetId);
    let coinsAdded = 0;

    await this.prisma.$transaction(async (tx) => {
      // re-read inside transaction to avoid race conditions
      const current = await tx.unlockCode.findUnique({ where: { id: code.id }, select: { usedCount: true } });
      if (current && code.maxUses !== null && current.usedCount >= code.maxUses) {
        throw new BadRequestException("Code usage limit reached");
      }

      const already = await tx.codeRedemption.findFirst({ where: { codeId: code.id, userId } });
      if (already) throw new BadRequestException("You have already redeemed this code");

      await tx.codeRedemption.create({ data: { codeId: code.id, userId, coinAmount: code.coinAmount } });
      await tx.unlockCode.update({ where: { id: code.id }, data: { usedCount: { increment: 1 } } });

      if (isContentCode) {
        const targetType = code.targetType;
        const targetId = code.targetId;
        if (!targetType || !targetId) {
          throw new BadRequestException("Invalid code target");
        }
        await tx.contentUnlock.upsert({
          where: { userId_targetType_targetId: { userId, targetType, targetId } },
          update: {},
          create: { userId, targetType, targetId, unlockMethod: "CODE", coinAmount: null },
        });
      } else {
        await tx.coinWallet.upsert({
          where: { userId },
          update: { balance: { increment: code.coinAmount } },
          create: { userId, balance: code.coinAmount },
        });
        coinsAdded = code.coinAmount;
      }
    });

    if (isContentCode) {
      await this.invalidateCurriculumCache(userId);
    }
    if (coinsAdded > 0 || isContentCode) {
      await this.invalidateDashboardCache(userId);
    }

    return { coinsAdded, unlocked: isContentCode };
  }

  async listRequests(userId: string, status?: string, page = 1, limit = 20): Promise<unknown> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (user.role !== "ADMINISTRATOR") where.userId = userId;
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.unlockRequest.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.unlockRequest.count({ where }),
    ]);
    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async submitRequest(userId: string, dto: { targetType: string; targetId: string }): Promise<unknown> {
    const existing = await this.prisma.unlockRequest.findFirst({
      where: { userId, targetType: dto.targetType, targetId: dto.targetId, status: "PENDING" },
    });
    if (existing) throw new BadRequestException("You already have a pending request for this content");
    return this.prisma.unlockRequest.create({
      data: { userId, targetType: dto.targetType, targetId: dto.targetId, status: "PENDING" },
    });
  }

  async resolveRequest(userId: string, id: string, dto: { status: string; adminNote?: string }): Promise<unknown> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Only administrators can resolve requests");
    const req = await this.prisma.unlockRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("Request not found");
    return this.prisma.unlockRequest.update({
      where: { id },
      data: { status: dto.status, adminNote: dto.adminNote ?? null, resolvedById: userId, resolvedAt: new Date() },
    });
  }

  async unlockContent(userId: string, dto: { targetType: string; targetId: string }): Promise<{ unlocked: boolean }> {
    if (!UNLOCK_TYPES.includes(dto.targetType as UnlockType)) {
      throw new BadRequestException("Unsupported unlock target");
    }

    if (dto.targetType === "TERM") {
      await this.verifyTermForStudent(userId, dto.targetId);
    }

    const existing = await this.prisma.contentUnlock.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } },
    });
    if (existing) return { unlocked: true };

    const { cost } = dto.targetType === "TERM"
      ? await this.getEffectiveTermCost(userId, dto.targetId)
      : await this.getUnlockCost(dto.targetType);

    await this.prisma.$transaction(async (tx) => {
      if (cost > 0) {
        const result = await tx.coinWallet.updateMany({
          where: { userId, balance: { gte: cost } },
          data: { balance: { decrement: cost } },
        });
        if (result.count === 0) {
          throw new BadRequestException("Insufficient coins");
        }
      }

      await tx.contentUnlock.create({
        data: { userId, targetType: dto.targetType, targetId: dto.targetId, unlockMethod: "COINS", coinAmount: cost > 0 ? cost : null },
      });
    });

    await this.invalidateCurriculumCache(userId);
    await this.invalidateDashboardCache(userId);

    if (dto.targetType === "UNIT" || dto.targetType === "TERM") {
      void this.referralService.handlePurchase(userId, dto.targetType, cost > 0 ? cost : 0).catch(() => undefined);
    }

    return { unlocked: true };
  }

  async checkAccess(userId: string, targetType: string, targetId: string): Promise<{ unlocked: boolean; hasProgress: boolean }> {
    if (targetType === "TERM") {
      const unlock = await this.prisma.contentUnlock.findUnique({
        where: { userId_targetType_targetId: { userId, targetType: "TERM", targetId } },
      });
      return { unlocked: !!unlock, hasProgress: false };
    }

    if (targetType === "UNIT") {
      const unit = await this.prisma.unit.findUnique({
        where: { id: targetId },
        select: { id: true, isPremium: true, lockedOverride: true, termId: true },
      });
      if (!unit) return { unlocked: false, hasProgress: false };
      if (unit.lockedOverride === true) return { unlocked: false, hasProgress: false };
      if (unit.lockedOverride === false || !unit.isPremium) return { unlocked: true, hasProgress: false };
      return { unlocked: await this.hasUnitOrTermUnlock(userId, unit), hasProgress: false };
    }

    if (targetType === "LESSON") {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          isPremium: true,
          lockedOverride: true,
          unit: { select: { id: true, isPremium: true, lockedOverride: true, termId: true } },
        },
      });
      const progress = await this.prisma.lessonProgress.findFirst({ where: { userId, lessonId: targetId } });
      if (!lesson) return { unlocked: false, hasProgress: !!progress };
      if (lesson.lockedOverride === true || lesson.unit.lockedOverride === true) return { unlocked: false, hasProgress: !!progress };
      if (lesson.lockedOverride === false) return { unlocked: true, hasProgress: !!progress };
      const needsPurchase = lesson.isPremium || (lesson.unit.isPremium && lesson.unit.lockedOverride !== false);
      if (!needsPurchase) return { unlocked: true, hasProgress: !!progress };
      return { unlocked: await this.hasUnitOrTermUnlock(userId, lesson.unit), hasProgress: !!progress };
    }

    return { unlocked: false, hasProgress: false };
  }

  private async hasUnitOrTermUnlock(
    userId: string,
    unit: { id: string; termId: string | null },
  ): Promise<boolean> {
    const unlocks = await this.prisma.contentUnlock.findMany({
      where: {
        userId,
        OR: [
          { targetType: "UNIT", targetId: unit.id },
          ...(unit.termId ? [{ targetType: "TERM", targetId: unit.termId }] : []),
        ],
      },
      select: { id: true },
    });
    return unlocks.length > 0;
  }

  async listMyPurchases(userId: string, page = 1, limit = 20): Promise<unknown> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.coinPurchase.findMany({
        where,
        include: { package: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.coinPurchase.count({ where }),
    ]);
    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async listMyUnlocks(userId: string, page = 1, limit = 20): Promise<unknown> {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.contentUnlock.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.contentUnlock.count({ where }),
    ]);
    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  private async creditWallet(userId: string, amount: number): Promise<void> {
    await this.prisma.coinWallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });
  }

  private async verifyTermForStudent(userId: string, termId: string): Promise<void> {
    const ctx = await this.academicContext.getStudentContext(userId);
    if (!ctx?.termId || ctx.termId !== termId) {
      throw new BadRequestException("This term is not available for your account");
    }
  }

  private async invalidateCurriculumCache(userId: string): Promise<void> {
    await this.cache.delByPattern(`curriculum:${userId}:*`);
  }

  private async invalidateDashboardCache(userId: string): Promise<void> {
    await this.cache.del(this.cache.generateKey("dashboard", userId));
  }
}
