import type { PrismaClient, UserRole, $Enums } from "@prisma/client";
import * as bcrypt from "bcryptjs";

export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{
    fullName: string;
    email: string;
    mobileNumber: string;
    role: UserRole;
    password: string;
    status: $Enums.AccountStatus;
  }> = {},
) {
  const passwordHash = await bcrypt.hash(overrides.password ?? "Test@123", 12);
  const ts = Date.now();
  return prisma.user.create({
    data: {
      fullName: overrides.fullName ?? "Test User",
      email: overrides.email ?? `test-${ts}@example.com`,
      mobileNumber: overrides.mobileNumber ?? `0100${String(ts).slice(-8)}`,
      role: overrides.role ?? "STUDENT",
      passwordHash,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function createTestAdmin(prisma: PrismaClient) {
  return createTestUser(prisma, { role: "ADMINISTRATOR" });
}

export async function createTestTeacher(prisma: PrismaClient) {
  return createTestUser(prisma, { role: "TEACHER" });
}

export async function createTestPayment(
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<{
    amount: number;
    status: string;
    productType: string;
    productId: string;
  }> = {},
) {
  return prisma.payment.create({
    data: {
      userId,
      amount: overrides.amount ?? 100,
      currency: "EGP",
      status: overrides.status ?? "COMPLETED",
      paymentMethod: "TEST",
      productType: overrides.productType ?? "COINS",
      productId: overrides.productId ?? "package-1",
      gatewayRef: `test-ref-${Date.now()}`,
    },
  });
}

export async function createTestCoinPackage(prisma: PrismaClient) {
  return prisma.coinPackage.create({
    data: { name: "Test Package", coinAmount: 100, price: 50, active: true },
  });
}

export async function createTestWallet(prisma: PrismaClient, userId: string, balance = 0) {
  return prisma.coinWallet.upsert({
    where: { userId },
    update: { balance },
    create: { userId, balance },
  });
}

export async function createTestUnlockCode(prisma: PrismaClient, overrides: Partial<{
  code: string;
  coinAmount: number;
  maxUses: number;
  createdById: string;
  active: boolean;
}> = {}) {
  const admin = overrides.createdById
    ? await prisma.user.findUnique({ where: { id: overrides.createdById } })
    : await createTestAdmin(prisma);
  if (!admin) throw new Error("Admin user not found for unlock code creation");
  return prisma.unlockCode.create({
    data: {
      code: overrides.code ?? `CODE-${String(Date.now()).slice(-8)}`,
      coinAmount: overrides.coinAmount ?? 50,
      maxUses: overrides.maxUses ?? null,
      active: overrides.active ?? true,
      createdById: admin.id,
    },
  });
}
