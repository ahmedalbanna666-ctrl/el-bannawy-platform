import { type TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { AuthService, type IAuthTokens } from "../src/auth/auth.service";
import { AuthRepository } from "../src/auth/auth.repository";
import { FirebaseAuthService } from "../src/auth/firebase-auth.service";
import { BootstrapService } from "../src/common/services/bootstrap.service";
import { DelegatedPermissionService } from "../src/auth/delegated/delegated-permission.service";
import { MailService } from "../src/mail/mail.service";
import { createTestingModule } from "./helpers/test-module";
import { createTestUser } from "./helpers/test-factory";

describe("Auth (e2e)", () => {
  let authService: AuthService;
  let prismaClient: PrismaClient;

  beforeAll(async () => {
    const module: TestingModule = await createTestingModule({
      providers: [
        AuthService,
        AuthRepository,
        { provide: BootstrapService, useValue: { bootstrapNewStudent: jest.fn().mockResolvedValue(undefined) } },
        { provide: DelegatedPermissionService, useValue: { getEffectivePermissions: jest.fn().mockResolvedValue([]) } },
        { provide: MailService, useValue: { sendVerificationCode: jest.fn().mockResolvedValue({ success: false }), sendEmail: jest.fn().mockResolvedValue({ success: false }) } },
        { provide: FirebaseAuthService, useValue: { isConfigured: jest.fn().mockReturnValue(false), verifyIdToken: jest.fn() } },
      ],
    });
    authService = module.get(AuthService);
    prismaClient = new PrismaClient();
  });

  beforeEach(async () => {
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"users\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"refresh_tokens\" CASCADE");
    await prismaClient.$executeRawUnsafe("TRUNCATE TABLE \"sessions\" CASCADE");
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  describe("register", () => {
    it("creates a new user and requests email verification", async () => {
      const result = await authService.register({
        fullName: "Test Student",
        email: "student1@example.com",
        mobile: "+201000000001",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
      });
      expect(result).toEqual({ userId: expect.any(String), requiresEmailVerification: true });
    });

    it("rejects duplicate email", async () => {
      await createTestUser(prismaClient, { email: "dupe@example.com" });
      await expect(
        authService.register({
          fullName: "Dupe",
          email: "dupe@example.com",
          mobile: "+201000000001",
          password: "StrongP@ss1",
          confirmPassword: "StrongP@ss1",
        }),
      ).rejects.toThrow("Email already registered");
    });

    it("rejects password mismatch", async () => {
      await expect(
        authService.register({
          fullName: "Test",
          email: "student2@example.com",
          mobile: "+201000000002",
          password: "StrongP@ss1",
          confirmPassword: "DifferentP@ss1",
        }),
      ).rejects.toThrow("Passwords do not match");
    });
  });

  describe("login", () => {
    it("logs in with valid mobile", async () => {
      await createTestUser(prismaClient, { mobileNumber: "+201099999999", password: "Test@123" });
      const result = await authService.login(
        { identity: "+201099999999", password: "Test@123" },
      );
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("rejects wrong password", async () => {
      await createTestUser(prismaClient, { mobileNumber: "+201088888888", password: "Test@123" });
      await expect(
        authService.login({ identity: "+201088888888", password: "WrongPass1" }),
      ).rejects.toThrow("Invalid email/phone or password");
    });
  });

  describe("refresh token", () => {
    it("refreshes token and rotates refresh token", async () => {
      await createTestUser(prismaClient, { mobileNumber: "+201077777777", password: "Test@123" });
      const login = await authService.login({ identity: "+201077777777", password: "Test@123" }) as IAuthTokens;
      const result = await authService.refreshToken({ refreshToken: login.refreshToken });
      expect(result).toHaveProperty("accessToken");
      expect(result.refreshToken).not.toBe(login.refreshToken);
    });

    it("rejects invalid refresh token", async () => {
      await expect(
        authService.refreshToken({ refreshToken: "invalid-token" }),
      ).rejects.toThrow("Invalid or expired refresh token");
    });
  });

  describe("getMe", () => {
    it("returns user profile", async () => {
      const user = await createTestUser(prismaClient, { mobileNumber: "+201066666666" });
      const profile = await authService.getMe(user.id);
      expect(profile.id).toBe(user.id);
    });
  });
});
