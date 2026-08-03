import { type TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { ConfigurationService } from "../src/config/configuration.service";
import { CoinsService } from "../src/coins/coins.service";
import { PaymentsService } from "../src/payments/payments.service";
import { createTestingModule } from "./helpers/test-module";
import {
  createTestUser,
  createTestAdmin,
  createTestCoinPackage,
  createTestWallet,
} from "./helpers/test-factory";

describe("Payments (e2e)", () => {
  let config: ConfigurationService;
  let coinsService: CoinsService;
  let paymentsService: PaymentsService;
  let prismaClient: PrismaClient;

  beforeAll(async () => {
    const module: TestingModule = await createTestingModule({
      providers: [CoinsService, PaymentsService],
    });
    config = module.get(ConfigurationService);
    coinsService = module.get(CoinsService);
    paymentsService = module.get(PaymentsService);
    prismaClient = new PrismaClient();
  });

  beforeEach(async () => {
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"users\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"coin_packages\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"payments\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"coin_wallets\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"invoices\" CASCADE");
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  describe("checkout + verify flow", () => {
    it("creates a coin package checkout successfully", async () => {
      const user = await createTestUser(prismaClient);
      await createTestWallet(prismaClient, user.id, 0);
      const pkg = await createTestCoinPackage(prismaClient);

      const checkout = await paymentsService.checkout(user.id, {
        productType: "COINS",
        productId: pkg.id,
        paymentMethod: "TEST",
      });

      const cko = checkout as { checkoutId: string; amount: number };
      expect(cko).toHaveProperty("checkoutId");
      expect(cko.amount).toBe(100);
    });

    it("verifies a payment and updates wallet", async () => {
      const user = await createTestUser(prismaClient);
      await createTestWallet(prismaClient, user.id, 0);
      const pkg = await createTestCoinPackage(prismaClient);

      const checkout = await paymentsService.checkout(user.id, {
        productType: "COINS",
        productId: pkg.id,
        paymentMethod: "TEST",
      });

      const cko2 = checkout as { checkoutId: string; amount: number };
      const verified = await paymentsService.verifyPayment(
        cko2.checkoutId,
        { checkoutId: cko2.checkoutId, gatewayRef: "test-ref-123" },
      ) as { verified: boolean };

      expect(verified.verified).toBe(true);
      const wallet = await prismaClient.coinWallet.findUnique({ where: { userId: user.id } });
      expect(wallet?.balance).toBe(1000);
    });

    it("rejects duplicate verification", async () => {
      const user = await createTestUser(prismaClient);
      await createTestWallet(prismaClient, user.id, 0);
      const pkg = await createTestCoinPackage(prismaClient);
      const checkout = await paymentsService.checkout(user.id, {
        productType: "COINS",
        productId: pkg.id,
        paymentMethod: "TEST",
      }) as { checkoutId: string };

      await paymentsService.verifyPayment(
        checkout.checkoutId,
        { checkoutId: checkout.checkoutId, gatewayRef: "test-ref-456" },
      );

      const cko3 = checkout as { checkoutId: string };
      await expect(
        paymentsService.verifyPayment(
          cko3.checkoutId,
          { checkoutId: cko3.checkoutId, gatewayRef: "test-ref-789" },
        ),
      ).rejects.toThrow();
    });
  });

  describe("payment history", () => {
    it("returns empty history for new user", async () => {
      const user = await createTestUser(prismaClient);
      const history = await paymentsService.getHistory(user.id) as unknown[];
      expect(history).toEqual([]);
    });

    it("returns completed payments in history", async () => {
      const user = await createTestUser(prismaClient);
      await createTestWallet(prismaClient, user.id, 0);
      const pkg = await createTestCoinPackage(prismaClient);

      const checkout = await paymentsService.checkout(user.id, {
        productType: "COINS",
        productId: pkg.id,
        paymentMethod: "TEST",
      });
      const cko4 = checkout as { checkoutId: string };
      await paymentsService.verifyPayment(
        cko4.checkoutId,
        { checkoutId: cko4.checkoutId, gatewayRef: "test-ref-999" },
      );

      const history = await paymentsService.getHistory(user.id) as Array<{ status: string }>;
      expect(history.length).toBe(1);
      expect(history[0].status).toBe("SUCCESSFUL");
    });
  });
});
