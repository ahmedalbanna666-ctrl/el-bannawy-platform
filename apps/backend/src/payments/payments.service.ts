import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigurationService } from "../config/configuration.service";
import { ReferralService } from "../referral/referral.service";
import { LiveRefundStatusEnum } from "@el-bannawy/shared";
import type { CheckoutDto, VerifyPaymentDto, CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from "./dto/payment.dto";

const PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
    private readonly referralService: ReferralService,
  ) {}

  private get paymentMode(): string {
    return (process.env.NODE_ENV ?? "development").toLowerCase();
  }

  private get isProduction(): boolean {
    return this.paymentMode === "production";
  }

  private get hmacSecret(): string {
    return this.config.payment.webhookSecret;
  }

  private signPayload(payload: Record<string, string | number>): string {
    const sorted = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${String(payload[k])}`)
      .join("&");
    return createHmac("sha256", this.hmacSecret).update(sorted).digest("hex");
  }

  async handleWebhook(payload: { paymentId: string; gatewayRef: string; signature: string }): Promise<{ received: boolean }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: payload.paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");

    const expectedSig = this.signPayload({
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      productType: payment.productType,
      gatewayRef: payload.gatewayRef,
    });

    if (expectedSig !== payload.signature) {
      throw new ForbiddenException("Invalid webhook signature");
    }

    if (payment.status !== "PENDING") {
      return { received: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payload.paymentId },
        data: { status: "SUCCESSFUL", gatewayRef: payload.gatewayRef, completedAt: new Date() },
      });
      await this.activateContent(payment.userId, payment.productType, payment.productId, payment.amount);
    });

    return { received: true };
  }

  getPaymentMethods(): unknown {
    return {
      methods: [
        { id: "paymob", name: "Paymob", enabled: true },
        { id: "fawry", name: "Fawry", enabled: true },
        { id: "instapay", name: "Instapay", enabled: true },
      ],
    };
  }

  async checkout(userId: string, dto: CheckoutDto): Promise<unknown> {
    let discount = 0;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (!coupon) throw new BadRequestException("Invalid coupon code");

      if (!coupon.active) throw new BadRequestException("Coupon is not active");
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new BadRequestException("Coupon usage limit reached");
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        throw new BadRequestException("Coupon has expired");
      }

      couponId = coupon.id;
      discount = coupon.discountType === "PERCENTAGE"
        ? Math.round((this.getProductPrice(dto.productType) * coupon.discountValue) / 100)
        : coupon.discountValue;
    }

    const amount = Math.max(0, this.getProductPrice(dto.productType) - discount);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        productType: dto.productType,
        productId: dto.productId,
        amount,
        paymentMethod: dto.paymentMethod,
        discount,
        ...(couponId ? { couponId } : {}),
      },
    });

    const signature = this.signPayload({
      id: payment.id,
      userId,
      amount,
      productType: dto.productType,
    });

    const checkoutUrl = `/api/v1/payments/${payment.id}/verify?method=${dto.paymentMethod}&signature=${signature}`;

    return {
      checkoutId: payment.id,
      paymentUrl: checkoutUrl,
      amount,
      discount,
      signature,
      expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS).toISOString(),
    };
  }

  async verifyPayment(checkoutId: string, dto: VerifyPaymentDto): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: checkoutId },
    });

    if (!payment) throw new NotFoundException("Payment not found");

    if (Date.now() - payment.createdAt.getTime() > PAYMENT_TIMEOUT_MS) {
      await this.prisma.payment.update({
        where: { id: checkoutId },
        data: { status: "FAILED" },
      });
      throw new ForbiddenException("Payment has expired. Please start a new checkout.");
    }

    const expectedSig = this.signPayload({
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      productType: payment.productType,
    });

    const providedSig = dto.signature ?? "";
    const signatureValid = expectedSig === providedSig;

    if (!signatureValid && this.isProduction) {
      await this.prisma.payment.update({
        where: { id: checkoutId },
        data: { status: "FAILED", gatewayResponse: JSON.stringify({ reason: "invalid_signature" }) },
      });
      throw new ForbiddenException("Payment verification failed — invalid signature");
    }

    if (!signatureValid && !this.isProduction) {
      Logger.warn(
        `[DEV] Payment ${checkoutId}: signature mismatch. Accepting in non-production mode.`,
        "PaymentsService",
      );
    }

    const gatewayFormatValid = this.verifyGatewayFormat(payment.paymentMethod, dto.gatewayRef ?? "");

    if (!gatewayFormatValid && this.isProduction) {
      await this.prisma.payment.update({
        where: { id: checkoutId },
        data: { status: "FAILED", gatewayResponse: JSON.stringify({ reason: "invalid_gateway_ref" }) },
      });
      throw new ForbiddenException("Payment verification failed — invalid gateway reference format");
    }

    const status = (signatureValid || !this.isProduction) && gatewayFormatValid ? "SUCCESSFUL" : "FAILED";

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: checkoutId }, select: { status: true } });
      if (!current || current.status !== "PENDING") {
        throw new ForbiddenException("Payment already processed");
      }

      const updated = await tx.payment.update({
        where: { id: checkoutId },
        data: {
          status,
          gatewayRef: dto.gatewayRef ?? null,
          gatewayResponse: JSON.stringify({ verified: signatureValid, signature: providedSig }),
          completedAt: new Date(),
        },
      });

      if (status === "SUCCESSFUL") {
        await this.activateContent(updated.userId, updated.productType, updated.productId, updated.amount);

        const invoiceNumber = `INV-${String(Date.now())}-${String(Math.floor(Math.random() * 10000))}`;
        await tx.invoice.create({
          data: {
            paymentId: updated.id,
            number: invoiceNumber,
          },
        });

        if (updated.couponId) {
          await tx.coupon.update({
            where: { id: updated.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    });

    return {
      verified: status === "SUCCESSFUL",
      status,
      transactionId: checkoutId,
    };
  }

  async getHistory(userId: string): Promise<unknown> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        productType: true,
        productId: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        discount: true,
        createdAt: true,
        completedAt: true,
        invoice: { select: { id: true, number: true } },
      },
    });

    return payments;
  }

  async getPayment(paymentId: string): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        productType: true,
        productId: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        gatewayRef: true,
        discount: true,
        createdAt: true,
        completedAt: true,
        invoice: { select: { id: true, number: true } },
      },
    });

    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async getInvoices(userId: string): Promise<unknown> {
    const invoices = await this.prisma.invoice.findMany({
      where: { payment: { userId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        payment: {
          select: { productType: true, amount: true, currency: true, status: true, createdAt: true },
        },
      },
    });

    return invoices;
  }

  async getInvoice(invoiceId: string): Promise<unknown> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payment: {
          select: { productType: true, productId: true, amount: true, currency: true, paymentMethod: true, status: true, createdAt: true, user: { select: { fullName: true } } },
        },
      },
    });

    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async refundPayment(paymentId: string, reason?: string): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "SUCCESSFUL") throw new BadRequestException("Only successful payments can be refunded");

    const existingRefund = await this.prisma.liveRefund.findUnique({ where: { paymentId } });
    if (existingRefund) throw new BadRequestException("Refund already exists for this payment");

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REFUNDED" },
      });

      await this.deactivateContent(p.userId, p.productType, p.productId, p.amount);

      const refund = await tx.liveRefund.create({
        data: {
          paymentId,
          userId: p.userId,
          amount: p.amount,
          currency: p.currency,
          reason: reason ?? "Manual refund",
          status: LiveRefundStatusEnum.PROCESSED,
          processedAt: new Date(),
        },
      });

      return { payment: p, refund };
    });

    return { refunded: true, transactionId: updated.payment.id, refundId: updated.refund.id };
  }

  async getRefunds(): Promise<unknown> {
    const refunds = await this.prisma.liveRefund.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        paymentId: true,
        userId: true,
        amount: true,
        currency: true,
        reason: true,
        status: true,
        processedAt: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    });

    return refunds;
  }

  async validateCoupon(dto: ValidateCouponDto): Promise<unknown> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
    if (!coupon) return { valid: false };

    if (!coupon.active) return { valid: false, reason: "Coupon is not active" };
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: "Usage limit reached" };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, reason: "Coupon has expired" };
    }

    return {
      valid: true,
      discount: coupon.discountValue,
      discountType: coupon.discountType,
      applicableProducts: coupon.applicableProducts,
    };
  }

  async listCoupons(): Promise<unknown> {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createCoupon(dto: CreateCouponDto): Promise<unknown> {
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        applicableProducts: dto.applicableProducts,
      },
    });
  }

  async updateCoupon(couponId: string, dto: UpdateCouponDto): Promise<unknown> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException("Coupon not found");

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
    });
  }

  async deleteCoupon(couponId: string): Promise<unknown> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException("Coupon not found");

    await this.prisma.coupon.update({ where: { id: couponId }, data: { active: false } });
    return { deleted: true };
  }

  async getTransactions(): Promise<unknown> {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        productType: true,
        productId: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        discount: true,
        gatewayRef: true,
        createdAt: true,
        completedAt: true,
        user: { select: { fullName: true } },
      },
    });
  }

  async getAnalytics(): Promise<unknown> {
    const [totalRevenue, successCount, totalCount, refundCount, coinRevenue] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
      this.prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: "REFUNDED" } }),
      this.prisma.payment.aggregate({ where: { status: "SUCCESSFUL", productType: "COINS" }, _sum: { amount: true } }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      successCount,
      totalCount,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      refundRate: totalCount > 0 ? Math.round((refundCount / totalCount) * 100) : 0,
      coinRevenue: coinRevenue._sum.amount ?? 0,
    };
  }

  private verifyGatewayFormat(gatewayName: string, gatewayRef: string): boolean {
    if (!gatewayRef || typeof gatewayRef !== "string") return false;

    const ref = gatewayRef.trim();
    if (ref.length === 0) return false;

    switch (gatewayName) {
      case "paymob":
        return /^[a-f0-9]{24,40}$/i.test(ref);
      case "fawry":
        return /^[A-Za-z0-9]{8,64}$/.test(ref);
      case "instapay":
        return /^[A-Za-z0-9_-]{6,64}$/.test(ref);
      default:
        if (this.isProduction) return false;
        return /^[A-Za-z0-9_-]{8,128}$/.test(ref);
    }
  }

  private normalizeProductType(productType: string): string {
    return productType?.toLowerCase() ?? "";
  }

  private getProductPrice(productType: string): number {
    const prices: Record<string, number> = {
      lesson: 200,
      unit: 800,
      coins: 100,
    };
    return prices[this.normalizeProductType(productType)] ?? 200;
  }

  private async activateContent(userId: string, productType: string, productId: string, amount: number): Promise<void> {
    switch (this.normalizeProductType(productType)) {
      case "coins": {
        const coinsToAdd = amount * 10;
        await this.prisma.coinWallet.upsert({
          where: { userId },
          update: { balance: { increment: coinsToAdd } },
          create: { userId, balance: coinsToAdd },
        });
        break;
      }
      case "lesson": {
        await this.prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId: productId } },
          update: {},
          create: { userId, lessonId: productId, progress: 0 },
        });
        break;
      }
      case "unit": {
        const lessons = await this.prisma.lesson.findMany({
          where: { unitId: productId },
          select: { id: true },
        });
        const lessonIds = lessons.map((l) => l.id);
        const existingProgress = await this.prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: lessonIds } },
          select: { lessonId: true },
        });
        const existingIds = new Set(existingProgress.map((p) => p.lessonId));
        const newLessons = lessons.filter((l) => !existingIds.has(l.id));
        if (newLessons.length > 0) {
          await this.prisma.lessonProgress.createMany({
            data: newLessons.map((l) => ({ userId, lessonId: l.id, progress: 0 })),
            skipDuplicates: true,
          });
        }
        void this.referralService.handlePurchase(userId, "UNIT", amount).catch(() => undefined);
        break;
      }
      default:
        break;
    }
  }

  private async deactivateContent(userId: string, productType: string, productId: string, amount?: number): Promise<void> {
    switch (this.normalizeProductType(productType)) {
      case "coins":
      case "COIN_PACKAGE": {
        const coinAmount = amount ?? 0;
        if (coinAmount > 0) {
          await this.prisma.coinWallet.update({
            where: { userId },
            data: { balance: { decrement: coinAmount * 10 } },
          });
        }
        break;
      }
      case "lesson": {
        await this.prisma.lessonProgress.deleteMany({
          where: { userId, lessonId: productId },
        });
        break;
      }
      case "unit": {
        const lessons = await this.prisma.lesson.findMany({
          where: { unitId: productId },
          select: { id: true },
        });
        await this.prisma.lessonProgress.deleteMany({
          where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
        });
        break;
      }
      default:
        break;
    }
  }
}
