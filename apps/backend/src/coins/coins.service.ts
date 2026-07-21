import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CoinsService {
  constructor(private readonly prisma: PrismaService) {}

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
      return { verified: true, status: "COMPLETED", coinsAdded: purchase.coinAmount };
    }

    return { verified: true, status: "COMPLETED", coinsAdded: 0 };
  }

  async getUnlockCost(targetType: string): Promise<{ cost: number }> {
    const key = targetType === "UNIT" ? "unit_unlock_cost" : targetType === "LESSON" ? "lesson_unlock_cost" : null;
    if (!key) return { cost: 0 };
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return { cost: setting ? Number(setting.value) : targetType === "UNIT" ? 50 : 20 };
  }

  async setUnlockCost(userId: string, dto: { targetType: string; cost: number }): Promise<{ cost: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || (user.role !== "ADMINISTRATOR" && user.role !== "TEACHER")) {
      throw new ForbiddenException("Only administrators and teachers can set unlock costs");
    }
    const key = dto.targetType === "UNIT" ? "unit_unlock_cost" : dto.targetType === "LESSON" ? "lesson_unlock_cost" : null;
    if (!key) throw new BadRequestException("Invalid target type");
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(dto.cost) },
      create: { key, value: String(dto.cost) },
    });
    return { cost: dto.cost };
  }

  async listCodes(_userId: string): Promise<unknown[]> {
    return this.prisma.unlockCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
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
        await tx.contentUnlock.upsert({
          where: { userId_targetType_targetId: { userId, targetType: code.targetType!, targetId: code.targetId! } },
          update: {},
          create: { userId, targetType: code.targetType!, targetId: code.targetId!, unlockMethod: "CODE", coinAmount: null },
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

    return { coinsAdded, unlocked: isContentCode };
  }

  async listRequests(userId: string, status?: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (user.role !== "ADMINISTRATOR") where.userId = userId;
    return this.prisma.unlockRequest.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
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
    const existing = await this.prisma.contentUnlock.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } },
    });
    if (existing) return { unlocked: true };

    const { cost } = await this.getUnlockCost(dto.targetType);
    if (cost > 0) {
      const wallet = await this.prisma.coinWallet.findUnique({ where: { userId } });
      const balance = wallet?.balance ?? 0;
      if (balance < cost) throw new BadRequestException("Insufficient coins");
      await this.prisma.coinWallet.update({
        where: { userId },
        data: { balance: { decrement: cost } },
      });
    }

    await this.prisma.contentUnlock.create({
      data: { userId, targetType: dto.targetType, targetId: dto.targetId, unlockMethod: "COINS", coinAmount: cost > 0 ? cost : null },
    });
    return { unlocked: true };
  }

  async checkAccess(userId: string, targetType: string, targetId: string): Promise<{ unlocked: boolean; hasProgress: boolean }> {
    const unlock = await this.prisma.contentUnlock.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });
    const progress = targetType === "LESSON"
      ? await this.prisma.lessonProgress.findFirst({ where: { userId, lessonId: targetId } })
      : null;
    return { unlocked: !!unlock, hasProgress: !!progress };
  }

  async listMyPurchases(userId: string): Promise<unknown[]> {
    return this.prisma.coinPurchase.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listMyUnlocks(userId: string): Promise<unknown[]> {
    return this.prisma.contentUnlock.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async creditWallet(userId: string, amount: number): Promise<void> {
    await this.prisma.coinWallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });
  }
}
