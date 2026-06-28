import { Injectable, ConflictException, UnauthorizedException, NotFoundException, HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto } from "./dto/auth.dto";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600; // 7 days
const SALT_ROUNDS = 12;

interface ITokenPayload {
  sub: string;
  role: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; status: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException("Passwords do not match");
    }

    const existing = await this.prisma.user.findFirst({
      where: { mobileNumber: dto.mobile, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException("Mobile number already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        mobileNumber: dto.mobile,
        passwordHash,
        role: "STUDENT",
        status: "PENDING_VERIFICATION",
      },
    });

    return {
      userId: user.id,
      status: "pending_verification",
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<IAuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { mobileNumber: dto.mobile, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid mobile number or password");
    }

    if (user.status !== "ACTIVE") {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Account not active");
      throw new UnauthorizedException("Account is not active");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Invalid password");
      throw new UnauthorizedException("Invalid mobile number or password");
    }

    await this.logLoginAttempt(user.id, ipAddress, userAgent, true, null);

    return this.generateTokens(user.id, user.role);
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId, token },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async refreshToken(dto: RefreshTokenDto): Promise<IAuthTokens> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user.id, storedToken.user.role);
  }

  async forgotPassword(mobile: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { mobileNumber: mobile, deletedAt: null },
    });

    if (!user) {
      return "If the mobile number is registered, a verification code will be sent";
    }

    const existingCodes = await this.prisma.passwordReset.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gte: new Date() } },
    });

    if (existingCodes.length >= 3) {
      throw new HttpException("Too many reset requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        verificationCode,
        expiresAt,
      },
    });

    // In production, send SMS with verificationCode
    console.warn(`Development: verification code generated for mobile ending in ${mobile.slice(-4)}`);

    return "If the mobile number is registered, a verification code will be sent";
  }

  async resetPassword(dto: ResetPasswordDto): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { mobileNumber: dto.mobile, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("Invalid request");
    }

    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        verificationCode: dto.verificationCode,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!resetRecord) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return "Password updated successfully";
  }

  async getMe(userId: string): Promise<{
    id: string;
    fullName: string;
    mobileNumber: string;
    role: string;
    status: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      role: user.role,
      status: user.status,
    };
  }

  async getSessions(userId: string): Promise<{ id: string; createdAt: Date; expiresAt: Date }[]> {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gte: new Date() } },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  private async generateTokens(userId: string, role: string): Promise<IAuthTokens> {
    const payload: ITokenPayload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshTokenValue = uuidv4();
    const refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
    );

    const sessionToken = uuidv4();
    const sessionExpiresAt = refreshTokenExpiresAt;

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId,
          token: sessionToken,
          expiresAt: sessionExpiresAt,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          token: refreshTokenValue,
          expiresAt: refreshTokenExpiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  }

  private async logLoginAttempt(
    userId: string | null,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        userId: userId ?? "",
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        success,
        failureReason,
      },
    });
  }
}
