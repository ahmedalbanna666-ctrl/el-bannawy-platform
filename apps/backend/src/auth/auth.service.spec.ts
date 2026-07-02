import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
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
  coinWallet: {
    create: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  signAsync: jest.fn().mockResolvedValue("mock-jwt-token"),
  verifyAsync: jest.fn().mockResolvedValue({ sub: "user-id" }),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should throw if mobile number already exists", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "existing" });

      await expect(
        service.register({
          fullName: "Test User",
          mobile: "+201000000000",
          password: "Password123",
          confirmPassword: "Password123",
        }),
      ).rejects.toThrow("Mobile number already registered");
    });

    it("should throw if passwords do not match", async () => {
      await expect(
        service.register({
          fullName: "Test User",
          mobile: "+201000000000",
          password: "Password123",
          confirmPassword: "different",
        }),
      ).rejects.toThrow("Passwords do not match");
    });

    it("should create user successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        fullName: "Test User",
        role: "STUDENT",
        status: "ACTIVE",
      });

      const result = await service.register({
        fullName: "Test User",
        mobile: "+201000000000",
        password: "Password123",
        confirmPassword: "Password123",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("expiresIn");
    });
  });

  describe("login", () => {
    it("should throw if user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ mobile: "+201000000000", password: "wrong" }),
      ).rejects.toThrow("Invalid mobile number or password");
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
      ).rejects.toThrow("Invalid mobile number or password");
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

      const result = await service.login({ mobile: "+201000000000", password: "Password123" });

      expect(result).toHaveProperty("accessToken");
    });
  });
});
