import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { FirebaseAuthService } from "./firebase-auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { BootstrapService } from "../common/services/bootstrap.service";
import { DelegatedPermissionService } from "./delegated/delegated-permission.service";
import { ConfigurationService } from "../config/configuration.service";
import { MailService } from "../mail/mail.service";
import { ReferralService } from "../referral/referral.service";
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  loginHistory: {
    create: jest.fn(),
  },
  passwordReset: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailVerification: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: "ev-id" }),
    update: jest.fn(),
  },
  coinWallet: {
    create: jest.fn(),
  },
  systemSetting: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  signAsync: jest.fn().mockResolvedValue("mock-jwt-token"),
  verifyAsync: jest.fn().mockResolvedValue({ sub: "user-id" }),
};

const mockBootstrapService = {
  bootstrapNewStudent: jest.fn().mockResolvedValue(undefined),
};

const mockDelegatedPermissionService = {
  getEffectivePermissions: jest.fn().mockResolvedValue([]),
  isWithinCeiling: jest.fn().mockReturnValue(true),
};

const mockConfigurationService = {
  app: {
    port: 4000,
    nodeEnv: "test",
    frontendUrl: "http://localhost:3000",
    publicBaseUrl: "http://localhost:4000",
  },
  auth: {
    jwtSecret: "test-jwt-secret-minimum-16-chars!!",
    jwtExpiry: "15m",
    googleClientId: "",
    googleClientSecret: "",
    googleCallbackUrl: "",
    appleClientId: "",
    appleTeamId: "",
    appleKeyId: "",
    applePrivateKey: "",
    appleCallbackUrl: "",
  },
  email: {
    brevoApiKey: "",
    brevoSenderEmail: "",
    brevoSenderName: "El-bannawy Platform",
    firebaseProjectId: "",
    firebaseClientEmail: "",
    firebasePrivateKey: "",
  },
};

const mockMailService = {
  sendVerificationCode: jest.fn().mockResolvedValue({ success: false }),
  sendEmail: jest.fn().mockResolvedValue({ success: false }),
};

const mockFirebaseAuthService = {
  isConfigured: jest.fn().mockReturnValue(false),
  verifyIdToken: jest.fn(),
};

const mockReferralService = {
  applyReferral: jest.fn().mockResolvedValue({ applied: true }),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: BootstrapService, useValue: mockBootstrapService },
        { provide: DelegatedPermissionService, useValue: mockDelegatedPermissionService },
        { provide: AuthRepository, useValue: { findUserByEmailOrPhone: mockPrisma.user.findFirst, findRecentLoginHistory: jest.fn().mockResolvedValue(0) } },
        { provide: ConfigurationService, useValue: mockConfigurationService },
        { provide: MailService, useValue: mockMailService },
        { provide: FirebaseAuthService, useValue: mockFirebaseAuthService },
        { provide: ReferralService, useValue: mockReferralService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should throw if email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.register({
          fullName: "Test User",
          email: "test@example.com",
          mobile: "+201000000000",
          password: "Password123",
          confirmPassword: "Password123",
        }),
      ).rejects.toThrow("Email already registered");
    });

    it("should throw if passwords do not match", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          fullName: "Test User",
          email: "test@example.com",
          mobile: "+201000000000",
          password: "Password123",
          confirmPassword: "different",
        }),
      ).rejects.toThrow("Passwords do not match");
    });

    it("should create user and request email verification", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        fullName: "Test User",
        email: "test@example.com",
        role: "STUDENT",
        status: "PENDING_VERIFICATION",
      });

      const result = await service.register({
        fullName: "Test User",
        email: "test@example.com",
        mobile: "+201000000000",
        password: "Password123",
        confirmPassword: "Password123",
      });

      expect(result).toEqual({ userId: "new-user-id", requiresEmailVerification: true });
      expect(mockMailService.sendVerificationCode).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should throw if user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ mobile: "+201000000000", password: "wrong" }),
      ).rejects.toThrow("Invalid email/phone or password");
    });

    it("should throw if password is incorrect", async () => {
      const hash = await bcrypt.hash("Password123", 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        passwordHash: hash,
        status: "ACTIVE",
        role: "STUDENT",
      });
      mockPrisma.loginHistory.create.mockResolvedValue({ id: "log" });

      await expect(
        service.login({ mobile: "+201000000000", password: "wrong" }),
      ).rejects.toThrow("Invalid email/phone or password");
    });

    it("should login successfully", async () => {
      const hash = await bcrypt.hash("Password123", 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        passwordHash: hash,
        role: "STUDENT",
        status: "ACTIVE",
      });
      mockPrisma.loginHistory.create.mockResolvedValue({ id: "log" });
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.create.mockResolvedValue({ id: "session-id" });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: "rt-id" });

      const result = await service.login({ mobile: "+201000000000", password: "Password123" });

      expect(result).toHaveProperty("accessToken");
    });
  });
});
