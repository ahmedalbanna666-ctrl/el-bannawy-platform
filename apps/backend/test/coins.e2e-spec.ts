import type { TestingModule } from "@nestjs/testing";
import { PrismaService } from "../src/prisma/prisma.service";
import { CoinsService } from "../src/coins/coins.service";
import { PaymentsService } from "../src/payments/payments.service";
import { createTestingModule } from "./helpers/test-module";
import { createTestUser, createTestAdmin, createTestCoinPackage, createTestWallet, createTestUnlockCode } from "./helpers/test-factory";

describe("Coins E2E", () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let coins: CoinsService;

  beforeAll(async () => {
    module = await createTestingModule({
      providers: [CoinsService, PaymentsService],
    });
    prisma = module.get(PrismaService);
    coins = module.get(CoinsService);
  });

  afterEach(async () => {
    await prisma.coinPurchase.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.contentUnlock.deleteMany();
    await prisma.codeRedemption.deleteMany();
    await prisma.coinWallet.deleteMany();
    await prisma.unlockCode.deleteMany();
    await prisma.coinPackage.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  describe("Wallet", () => {
    it("creates a wallet with zero balance on first access", async () => {
      const user = await createTestUser(prisma);
      const wallet = await coins.getWallet(user.id);
      expect(wallet).toBeDefined();
      expect(wallet).toHaveProperty("balance", 0);
    });

    it("returns existing wallet on subsequent access", async () => {
      const user = await createTestUser(prisma);
      await createTestWallet(prisma, user.id, 500);
      const wallet = await coins.getWallet(user.id);
      expect(wallet).toHaveProperty("balance", 500);
    });
  });

  describe("Packages", () => {
    it("lists only active packages for a non-admin user", async () => {
      const user = await createTestUser(prisma);
      await createTestCoinPackage(prisma);
      const pkg2 = await prisma.coinPackage.create({
        data: { name: "Inactive Pack", coinAmount: 500, price: 200, active: false },
      });
      const packages = await coins.listPackages(user.id) as { name: string }[];
      const names = packages.map((p) => p.name);
      expect(names).not.toContain("Inactive Pack");
    });
  });

  describe("Unlock Codes", () => {
    it("redeems a valid code and credits the wallet", async () => {
      const user = await createTestUser(prisma);
      const admin = await createTestAdmin(prisma);
      const code = await createTestUnlockCode(prisma, { coinAmount: 100, createdById: admin.id });
      const result = await coins.redeemCode(user.id, code.code);
      expect(result.coinsAdded).toBe(100);
      const wallet = await prisma.coinWallet.findUnique({ where: { userId: user.id } });
      expect(wallet?.balance).toBe(100);
    });

    it("rejects expired codes", async () => {
      const user = await createTestUser(prisma);
      const admin = await createTestAdmin(prisma);
      const code = await prisma.unlockCode.create({
        data: {
          code: `EXP-${String(Date.now()).slice(-8)}`,
          coinAmount: 50,
          maxUses: 1,
          active: true,
          expiresAt: new Date(Date.now() - 86400000),
          createdById: admin.id,
        },
      });
      await expect(coins.redeemCode(user.id, code.code)).rejects.toThrow("Code has expired");
    });

    it("prevents duplicate redemption", async () => {
      const user = await createTestUser(prisma);
      const admin = await createTestAdmin(prisma);
      const code = await createTestUnlockCode(prisma, { createdById: admin.id });
      await coins.redeemCode(user.id, code.code);
      await expect(coins.redeemCode(user.id, code.code)).rejects.toThrow("already redeemed");
    });

    it("enforces maxUses limit", async () => {
      const admin = await createTestAdmin(prisma);
      const user1 = await createTestUser(prisma);
      const user2 = await createTestUser(prisma);
      const code = await createTestUnlockCode(prisma, { maxUses: 1, createdById: admin.id });
      await coins.redeemCode(user1.id, code.code);
      await expect(coins.redeemCode(user2.id, code.code)).rejects.toThrow("Code usage limit reached");
    });
  });

  describe("Content Unlock", () => {
    it("unlocks content by deducting coins", async () => {
      const user = await createTestUser(prisma);
      await createTestWallet(prisma, user.id, 200);
      const lessonId = "00000000-0000-0000-0000-000000000001";

      await prisma.systemSetting.upsert({
        where: { key: "lesson_unlock_cost" },
        update: { value: "50" },
        create: { key: "lesson_unlock_cost", value: "50" },
      });

      const result = await coins.unlockContent(user.id, { targetType: "LESSON", targetId: lessonId });
      expect(result.unlocked).toBe(true);

      const wallet = await prisma.coinWallet.findUnique({ where: { userId: user.id } });
      expect(wallet?.balance).toBe(150);

      const unlock = await prisma.contentUnlock.findUnique({
        where: { userId_targetType_targetId: { userId: user.id, targetType: "LESSON", targetId: lessonId } },
      });
      expect(unlock).toBeDefined();
      expect(unlock?.unlockMethod).toBe("COINS");
    });

    it("rejects unlock with insufficient coins", async () => {
      const user = await createTestUser(prisma);
      await createTestWallet(prisma, user.id, 10);
      const lessonId = "00000000-0000-0000-0000-000000000002";

      await prisma.systemSetting.upsert({
        where: { key: "lesson_unlock_cost" },
        update: { value: "50" },
        create: { key: "lesson_unlock_cost", value: "50" },
      });

      await expect(coins.unlockContent(user.id, { targetType: "LESSON", targetId: lessonId })).rejects.toThrow("Insufficient coins");
    });

    it("does not deduct coins for free content", async () => {
      const user = await createTestUser(prisma);
      await createTestWallet(prisma, user.id, 100);
      const lessonId = "00000000-0000-0000-0000-000000000003";

      await prisma.systemSetting.upsert({
        where: { key: "lesson_unlock_cost" },
        update: { value: "0" },
        create: { key: "lesson_unlock_cost", value: "0" },
      });

      const result = await coins.unlockContent(user.id, { targetType: "LESSON", targetId: lessonId });
      expect(result.unlocked).toBe(true);

      const wallet = await prisma.coinWallet.findUnique({ where: { userId: user.id } });
      expect(wallet?.balance).toBe(100);
    });
  });
});
