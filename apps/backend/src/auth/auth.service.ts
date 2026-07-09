import { Injectable, ConflictException, UnauthorizedException, NotFoundException, HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { BootstrapService } from "../common/services/bootstrap.service";
import { DelegatedPermissionService } from "./delegated/delegated-permission.service";
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto, CompleteOAuthRegistrationDto } from "./dto/auth.dto";
import { normalizeEgyptMobile } from "./phone.util";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
const ACCESS_TOKEN_REMEMBER_ME_EXPIRY = 30 * 24 * 3600; // 30 days
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
    private readonly bootstrapService: BootstrapService,
    private readonly delegatedPermissionService: DelegatedPermissionService,
  ) {}

  async register(dto: RegisterDto): Promise<IAuthTokens> {
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

    const resolved = await this.resolveAcademicContext(
      dto.educationalSystem,
      dto.educationalStage,
      dto.grade,
    );

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        englishName: dto.englishName ?? null,
        mobileNumber: dto.mobile,
        parentMobile: dto.parentMobile ?? null,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        governorate: dto.governorate ?? null,
        school: dto.school ?? null,
        educationalSystem: dto.educationalSystem ?? null,
        academicYearId: resolved.academicYearId,
        termId: resolved.termId,
        gradeId: resolved.gradeId,
      },
    });

    await this.bootstrapService.bootstrapNewStudent(user.id);

    return this.generateTokens(user.id, user.role);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<IAuthTokens> {
    const identifier = dto.identity ?? dto.mobile;

    if (!identifier) {
      throw new UnauthorizedException("Email or mobile number is required");
    }

    const isEmail = identifier.includes("@");
    const normalizedMobile = isEmail ? null : normalizeEgyptMobile(identifier);

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        ...(isEmail
          ? { email: identifier }
          : { mobileNumber: normalizedMobile ?? identifier }),
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    if (user.status !== "ACTIVE") {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Account not active");
      throw new UnauthorizedException("Account is not active");
    }

    if (!user.passwordHash) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "No password set");
      throw new UnauthorizedException("This account uses Google or Apple sign-in. Please sign in with that provider.");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Invalid password");
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    await this.logLoginAttempt(user.id, ipAddress, userAgent, true, null);

    const tokenExpiry = dto.rememberMe ? ACCESS_TOKEN_REMEMBER_ME_EXPIRY : ACCESS_TOKEN_EXPIRY;
    return this.generateTokens(user.id, user.role, tokenExpiry);
  }

  async logout(userId: string, _token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
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
    mobileNumber: string | null;
    role: string;
    status: string;
    academicYearId: string | null;
    termId: string | null;
    gradeId: string | null;
    educationalSystem: string | null;
    effectivePermissions: string[];
    managedByTeacherId: string | null;
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
      academicYearId: user.academicYearId,
      termId: user.termId,
      gradeId: user.gradeId,
      educationalSystem: user.educationalSystem,
      effectivePermissions: await this.delegatedPermissionService.getEffectivePermissions(userId) as string[],
      managedByTeacherId: user.managedByTeacherId,
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

  async oauthLogin(params: {
    email: string;
    providerId: string;
    provider: string;
  }): Promise<IAuthTokens & { type: "existing" | "new" }> {
    const { email, providerId, provider } = params;

    const existingUser = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (existingUser) {
      await this.linkOAuthProvider(existingUser.id, provider, providerId);
      const tokens = await this.generateTokens(existingUser.id, existingUser.role);
      return { ...tokens, type: "existing" };
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: "",
        email,
        [provider === "google" ? "googleId" : "appleId"]: providerId,
        oauthProvider: provider,
        role: "STUDENT",
        status: "PENDING_VERIFICATION",
      },
    });

    await this.bootstrapService.bootstrapNewStudent(user.id);

    const tokens = await this.generateTokens(user.id, user.role);
    return { ...tokens, type: "new" };
  }

  async completeOAuthRegistration(dto: CompleteOAuthRegistrationDto): Promise<IAuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("OAuth session not found. Please sign in with Google or Apple first.");
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const resolved = await this.resolveAcademicContext(
      dto.educationalSystem,
      dto.educationalStage,
      dto.grade,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: dto.fullName,
        englishName: dto.englishName ?? null,
        mobileNumber: dto.mobile,
        parentMobile: dto.parentMobile ?? null,
        passwordHash: passwordHash ?? undefined,
        status: "ACTIVE",
        governorate: dto.governorate ?? null,
        school: dto.school ?? null,
        educationalSystem: dto.educationalSystem ?? null,
        academicYearId: resolved.academicYearId,
        termId: resolved.termId,
        gradeId: resolved.gradeId,
      },
    });

    await this.bootstrapService.bootstrapNewStudent(user.id);

    return this.generateTokens(user.id, user.role);
  }

  private async linkOAuthProvider(
    userId: string,
    provider: string,
    providerId: string,
  ): Promise<void> {
    const data =
      provider === "google"
        ? { googleId: providerId, oauthProvider: "google" }
        : { appleId: providerId, oauthProvider: "apple" };

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  private async generateTokens(
    userId: string,
    role: string,
    accessTokenExpiry: number = ACCESS_TOKEN_EXPIRY,
  ): Promise<IAuthTokens> {
    const payload: ITokenPayload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
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
      expiresIn: accessTokenExpiry,
    };
  }

  private async logLoginAttempt(
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        success,
        failureReason,
      },
    });
  }

  private async resolveAcademicContext(
    educationalSystem?: string,
    educationalStage?: string,
    grade?: string,
  ): Promise<{ academicYearId: string | null; termId: string | null; gradeId: string | null }> {
    const [activeYearId, activeTermId] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: "active_academic_year_id" } }),
      this.prisma.systemSetting.findUnique({ where: { key: "active_term_id" } }),
    ]);

    const academicYearId = activeYearId?.value ?? null;
    const termId = activeTermId?.value ?? null;

    let gradeId: string | null = null;
    if (educationalStage && grade) {
      const stage = await this.prisma.stage.findFirst({
        where: { name: { equals: educationalStage, mode: "insensitive" } },
        select: { id: true },
      });
      if (stage) {
        const matched = await this.prisma.grade.findFirst({
          where: { name: { equals: grade, mode: "insensitive" }, stageId: stage.id },
          select: { id: true },
        });
        gradeId = matched?.id ?? null;
      }
    }

    return { academicYearId, termId, gradeId };
  }
}
