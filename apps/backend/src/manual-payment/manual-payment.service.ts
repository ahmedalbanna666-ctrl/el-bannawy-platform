import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, NotificationTargetType } from "../notifications/dto/notification.dto";
import type { CreateTransferNumberDto, UpdateTransferNumberDto, SubmitOrderDto, ReviewOrderDto } from "./dto";

const REVIEWER_ROLES: readonly ("ADMINISTRATOR" | "SECRETARY" | "SUPPORT" | "TEACHER")[] = [
  "ADMINISTRATOR",
  "SECRETARY",
  "SUPPORT",
  "TEACHER",
];

@Injectable()
export class ManualPaymentService {
  private readonly logger = new Logger(ManualPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listTransferNumbers(activeOnly = false) {
    const where = activeOnly ? { active: true } : {};
    return this.prisma.paymentTransferNumber.findMany({ where, orderBy: { createdAt: "asc" } });
  }

  async getTransferNumber(id: string) {
    const num = await this.prisma.paymentTransferNumber.findUnique({ where: { id } });
    if (!num) throw new NotFoundException("Transfer number not found");
    return num;
  }

  async createTransferNumber(dto: CreateTransferNumberDto) {
    return this.prisma.paymentTransferNumber.create({ data: dto });
  }

  async updateTransferNumber(id: string, dto: UpdateTransferNumberDto) {
    await this.getTransferNumber(id);
    return this.prisma.paymentTransferNumber.update({ where: { id }, data: dto });
  }

  async deleteTransferNumber(id: string) {
    await this.getTransferNumber(id);
    return this.prisma.paymentTransferNumber.delete({ where: { id } });
  }

  async submitOrder(userId: string, dto: SubmitOrderDto) {
    const order = await this.prisma.manualPaymentOrder.create({
      data: {
        userId,
        packageId: dto.packageId,
        amount: dto.amount,
        coinAmount: dto.coinAmount,
        gateway: dto.gateway,
        transferNumber: dto.transferNumber,
        senderNumber: dto.senderNumber,
        transactionRef: dto.transactionRef,
        screenshot: dto.screenshot ?? null,
      },
      include: {
        package: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    void this.notifyReviewers(order).catch((err: unknown) => {
      this.logger.error(`New order notification failed: ${err instanceof Error ? err.message : "Unknown"}`);
    });

    return order;
  }

  private async notifyReviewers(order: {
    userId: string;
    amount: number;
    coinAmount: number;
    package?: { name?: string | null } | null;
    user?: { fullName?: string | null } | null;
  }): Promise<void> {
    const reviewers = await this.prisma.user.findMany({
      where: { role: { in: [...REVIEWER_ROLES] }, deletedAt: null },
      select: { id: true },
    });

    const studentName = order.user?.fullName ?? "طالب";
    const packageName = order.package?.name ?? "باقة";
    const message =
      `أرسل الطالب ${studentName} إيصال دفع جديد: ${packageName} ` +
      `(${String(order.amount)} EGP مقابل ${String(order.coinAmount)} عملة). برجاء مراجعة الطلب.`;

    for (const reviewer of reviewers) {
      await this.notifications.sendNotification(reviewer.id, {
        type: "payment_receipt",
        title: "طلب دفع جديد",
        message,
        priority: NotificationPriority.MEDIUM,
        targetType: NotificationTargetType.INDIVIDUAL,
        targetId: reviewer.id,
      });
    }
  }

  async listOrders(userId: string, role: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (role === "STUDENT") where.userId = userId;
    if (status) where.status = status;

    return this.prisma.manualPaymentOrder.findMany({
      where,
      include: { package: true, user: { select: { id: true, fullName: true, email: true, mobileNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrder(orderId: string, userId: string, role: string) {
    const order = await this.prisma.manualPaymentOrder.findUnique({
      where: { id: orderId },
      include: { package: true, user: { select: { id: true, fullName: true, email: true, mobileNumber: true } } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (role === "STUDENT" && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async reviewOrder(orderId: string, reviewerId: string, dto: ReviewOrderDto) {
    const order = await this.prisma.manualPaymentOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "PENDING") throw new ForbiddenException("Order already reviewed");

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.manualPaymentOrder.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          adminNote: dto.adminNote ?? null,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      if (dto.status === "APPROVED") {
        await tx.coinWallet.upsert({
          where: { userId: order.userId },
          create: { userId: order.userId, balance: order.coinAmount },
          update: { balance: { increment: order.coinAmount } },
        });

        await tx.coinPurchase.create({
          data: {
            userId: order.userId,
            packageId: order.packageId,
            coinAmount: order.coinAmount,
            price: order.amount,
            status: "COMPLETED",
          },
        });
      }

      return updated;
    });

    void this.notifyStudent(reviewerId, order, dto).catch((err: unknown) => {
      this.logger.error(`Review notification failed: ${err instanceof Error ? err.message : "Unknown"}`);
    });

    return result;
  }

  private async notifyStudent(
    reviewerId: string,
    order: { userId: string; coinAmount: number; amount: number },
    dto: ReviewOrderDto,
  ): Promise<void> {
    const approved = dto.status === "APPROVED";
    await this.notifications.sendNotification(reviewerId, {
      type: "payment_receipt",
      title: approved ? "تمت الموافقة على طلب الدفع" : "تم رفض طلب الدفع",
      message: approved
        ? `تمت الموافقة على طلبك وإضافة ${String(order.coinAmount)} عملة إلى محفظتك.`
        : `نعتذر، تم رفض طلب الدفع الخاص بك.${dto.adminNote ? ` السبب: ${dto.adminNote}` : ""}`,
      priority: approved ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: order.userId,
    });
  }
}
