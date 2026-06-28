import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CheckoutDto, VerifyPaymentDto, CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from "./dto/payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private static INVOICE_COUNTER = 1000;

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

    // Simulate gateway checkout URL (production would redirect to real gateway)
    const checkoutUrl = `/api/v1/payments/${payment.id}/verify?method=${dto.paymentMethod}`;

    return {
      checkoutId: payment.id,
      paymentUrl: checkoutUrl,
      amount,
      discount,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async verifyPayment(checkoutId: string, dto: VerifyPaymentDto): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: checkoutId },
    });

    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "PENDING") {
      throw new ForbiddenException("Payment already processed");
    }

    // In production, verify the gatewayRef with the actual payment gateway
    const verified = dto.gatewayRef.length > 0;

    const status = verified ? "SUCCESSFUL" : "FAILED";

    const updated = await this.prisma.payment.update({
      where: { id: checkoutId },
      data: {
        status,
        gatewayRef: dto.gatewayRef,
        gatewayResponse: JSON.stringify({ verified }),
        completedAt: new Date(),
      },
    });

    if (status === "SUCCESSFUL") {
      await this.activateContent(payment.userId, payment.productType, payment.productId, payment.amount);

      // Generate invoice
      const invoiceNumber = `INV-${String(Date.now())}-${String(PaymentsService.INVOICE_COUNTER++)}`;
      await this.prisma.invoice.create({
        data: {
          paymentId: payment.id,
          number: invoiceNumber,
        },
      });
    }

    // Increment coupon usage if a coupon was used
    if (payment.couponId) {
      await this.prisma.coupon.update({
        where: { id: payment.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return {
      verified,
      status,
      transactionId: updated.id,
    };
  }

  async getHistory(userId: string): Promise<unknown> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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

  async refundPayment(paymentId: string): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "SUCCESSFUL") throw new BadRequestException("Only successful payments can be refunded");

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    return { refunded: true, transactionId: updated.id };
  }

  async getRefunds(): Promise<unknown> {
    const refunds = await this.prisma.payment.findMany({
      where: { status: "REFUNDED" },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        userId: true,
        productType: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        completedAt: true,
        user: { select: { fullName: true } },
      },
    });

    return refunds;
  }

  // --- Coupons ---

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

  // --- Transactions ---

  async getTransactions(): Promise<unknown> {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
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

  // --- Analytics ---

  async getAnalytics(): Promise<unknown> {
    const [totalRevenue, successCount, totalCount, refundCount, coinRevenue] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: "SUCCESSFUL" },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: "REFUNDED" } }),
      this.prisma.payment.aggregate({
        where: { status: "SUCCESSFUL", productType: "coins" },
        _sum: { amount: true },
      }),
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

  // --- Private ---

  private getProductPrice(productType: string): number {
    const prices: Record<string, number> = {
      lesson: 200,
      unit: 800,
      coins: 100,
    };
    return prices[productType] ?? 200;
  }

  private async activateContent(userId: string, productType: string, productId: string, amount: number): Promise<void> {
    switch (productType) {
      case "coins": {
        const coinsToAdd = amount * 10; // 1 EGP = 10 coins
        await this.prisma.coinWallet.upsert({
          where: { userId },
          update: { balance: { increment: coinsToAdd } },
          create: { userId, balance: coinsToAdd },
        });
        break;
      }
      case "lesson": {
        // Mark lesson as purchased/premium-accessible
        await this.prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId: productId } },
          update: {},
          create: { userId, lessonId: productId, progress: 0 },
        });
        break;
      }
      case "unit": {
        // Unlock all lessons in the unit
        const lessons = await this.prisma.lesson.findMany({
          where: { unitId: productId },
          select: { id: true },
        });
        for (const lesson of lessons) {
          await this.prisma.lessonProgress.upsert({
            where: { userId_lessonId: { userId, lessonId: lesson.id } },
            update: {},
            create: { userId, lessonId: lesson.id, progress: 0 },
          });
        }
        break;
      }
      default:
        break;
    }
  }
}
