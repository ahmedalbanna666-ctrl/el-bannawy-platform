import { Injectable, ConflictException, UnauthorizedException, NotFoundException, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createPrivateKey, sign } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BootstrapService } from "../common/services/bootstrap.service";
import { DelegatedPermissionService } from "./delegated/delegated-permission.service";
import { AuthRepository } from "./auth.repository";
import { ReferralService } from "../referral/referral.service";
import { ConfigurationService } from "../config/configuration.service";
import { MailService } from "../mail/mail.service";
import { FirebaseAuthService } from "./firebase-auth.service";
import { verifyAppleIdToken } from "./apple-token.verify";
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto, CompleteOAuthRegistrationDto, VerifyEmailDto, ResendVerificationDto, FirebaseLoginDto } from "./dto/auth.dto";
import { normalizeEgyptMobile } from "./phone.util";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const ACCESS_TOKEN_EXPIRY = 3600;
const ACCESS_TOKEN_REMEMBER_ME_EXPIRY = 30 * 24 * 3600;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600;
const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const PENDING_LOGIN_TTL_MS = 5 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000;

interface ITokenPayload {
  sub: string;
  role: string;
  sessionId: string;
}

export interface IAuthTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface IRequiresConfirmation {
  requiresConfirmation: true;
  confirmToken: string;
}

export interface PendingLoginData {
  userId: string;
  role: string;
  rememberMe: boolean;
  oldSessionIds: string[];
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly pendingLogins = new Map<string, PendingLoginData>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly bootstrapService: BootstrapService,
    private readonly delegatedPermissionService: DelegatedPermissionService,
    private readonly authRepo: AuthRepository,
    private readonly config: ConfigurationService,
    private readonly referralService: ReferralService,
    private readonly mailService: MailService,
    private readonly firebaseAuth: FirebaseAuthService,
  ) {}

  async cleanupExpiredRecords(): Promise<{ sessions: number; tokens: number; history: number }> {
    const sessions = await this.authRepo.deleteExpiredSessions();
    const tokens = await this.authRepo.revokeExpiredRefreshTokens();
    const history = await this.authRepo.deleteOldLoginHistory(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    if (sessions > 0 || tokens > 0 || history > 0) {
      Logger.log(`Cleanup: ${sessions} sessions, ${tokens} tokens, ${history} login history records`, "AuthService");
    }
    return { sessions, tokens, history };
  }

  async register(dto: RegisterDto): Promise<{ userId: string; requiresEmailVerification: boolean }> {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException("Passwords do not match");
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingEmail = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      throw new ConflictException("Email already registered");
    }

    if (dto.mobile) {
      const existingMobile = await this.prisma.user.findFirst({
        where: { mobileNumber: dto.mobile, deletedAt: null },
      });
      if (existingMobile) {
        throw new ConflictException("Mobile number already registered");
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const resolved = await this.resolveAcademicContext(
      dto.educationalSystem,
      dto.educationalStage,
      dto.grade,
    );

    let firebaseUid: string | null = null;
    let firebaseEmailVerified = false;
    if (dto.firebaseIdToken) {
      const verified = await this.firebaseAuth.verifyIdToken(dto.firebaseIdToken);
      firebaseUid = verified.uid;
      firebaseEmailVerified = verified.emailVerified;
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        englishName: dto.englishName ?? null,
        email: normalizedEmail,
        mobileNumber: dto.mobile ?? null,
        parentMobile: dto.parentMobile ?? null,
        passwordHash,
        firebaseUid,
        role: "STUDENT",
        status: "PENDING_VERIFICATION",
        emailVerifiedAt: firebaseEmailVerified ? new Date() : null,
        governorate: dto.governorate ?? null,
        school: dto.school ?? null,
        educationalSystem: dto.educationalSystem ?? null,
        academicYearId: resolved.academicYearId,
        termId: resolved.termId,
        gradeId: resolved.gradeId,
      },
    });

    await this.bootstrapService.bootstrapNewStudent(user.id);

    if (firebaseEmailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE" },
      });
    } else {
      await this.sendVerificationCode(user.id, normalizedEmail);
    }

    if (dto.referralCode) {
      void this.referralService.applyReferral(user.id, dto.referralCode).catch((err: unknown) => {
        Logger.warn(`Referral application failed for user ${user.id}: ${err instanceof Error ? err.message : "Unknown"}`, "AuthService");
      });
    }

    return { userId: user.id, requiresEmailVerification: !firebaseEmailVerified };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ verified: boolean; email: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new NotFoundException("No account found for this email");
    }

    const record = await this.prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        verificationCode: dto.code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date(), status: "ACTIVE" },
      }),
    ]);

    return { verified: true, email: normalizedEmail };
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ sent: boolean }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.emailVerifiedAt) {
      return { sent: false };
    }

    const recentCount = await this.prisma.emailVerification.count({
      where: { userId: user.id, usedAt: null, expiresAt: { gte: new Date() } },
    });
    if (recentCount >= 3) {
      throw new HttpException("Too many verification requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.sendVerificationCode(user.id, normalizedEmail);
    return { sent: true };
  }

  async firebaseLogin(dto: FirebaseLoginDto): Promise<IAuthTokens> {
    const verified = await this.firebaseAuth.verifyIdToken(dto.idToken);
    if (!verified.email) {
      throw new UnauthorizedException("Firebase account has no email");
    }

    const normalizedEmail = verified.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedException("No account found for this email. Please register first.");
    }

    if (user.status !== "ACTIVE" || !user.emailVerifiedAt) {
      throw new UnauthorizedException("Please verify your email before logging in");
    }

    if (user.firebaseUid && user.firebaseUid !== verified.uid) {
      throw new UnauthorizedException("Firebase account does not match the registered account");
    }

    if (!user.firebaseUid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: verified.uid },
      });
    }

    const tokenExpiry = dto.rememberMe ? ACCESS_TOKEN_REMEMBER_ME_EXPIRY : ACCESS_TOKEN_EXPIRY;
    return this.generateTokens(user.id, user.role, tokenExpiry);
  }

  private async sendVerificationCode(userId: string, email: string): Promise<void> {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await this.prisma.emailVerification.create({
      data: { userId, email, verificationCode, expiresAt },
    });

    const result = await this.mailService.sendVerificationCode(email, verificationCode);
    if (!result.success) {
      Logger.warn(
        `Email verification code for ${email} could not be delivered. ` +
        `Development fallback code: ${verificationCode}`,
        "AuthService",
      );
    } else {
      Logger.log(`Verification code sent to ${email}`, "AuthService");
    }
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<IAuthTokens | IRequiresConfirmation> {
    const identifier = dto.identity ?? dto.mobile;

    if (!identifier) {
      throw new UnauthorizedException("Email or mobile number is required");
    }

    const isEmail = identifier.includes("@");
    const normalizedMobile = isEmail ? null : normalizeEgyptMobile(identifier);

    const user = await this.authRepo.findUserByEmailOrPhone(identifier, normalizedMobile);

    if (!user) {
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    if (user.status !== "ACTIVE") {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Account not active");
      if (user.status === "PENDING_VERIFICATION" && user.email) {
        throw new UnauthorizedException("Please verify your email before logging in");
      }
      throw new UnauthorizedException("Account is not active");
    }

    if (!user.passwordHash) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "No password set");
      throw new UnauthorizedException("This account uses Google or Apple sign-in. Please sign in with that provider.");
    }

    const recentFailedCount = await this.authRepo.findRecentLoginHistory(
      user.id,
      new Date(Date.now() - LOCKOUT_WINDOW_MS),
      false,
    );
    if (recentFailedCount >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        "Account temporarily locked due to too many failed attempts. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, false, "Invalid password");
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    await this.logLoginAttempt(user.id, ipAddress, userAgent, true, null);

    // ── Single-session enforcement for STUDENT role ──────────────
    if (user.role === "STUDENT") {
      const activeSessions = await this.prisma.session.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (activeSessions.length > 0) {
        const confirmToken = uuidv4();
        this.pendingLogins.set(confirmToken, {
          userId: user.id,
          role: user.role,
          rememberMe: !!dto.rememberMe,
          oldSessionIds: activeSessions.map((s) => s.id),
          expiresAt: new Date(Date.now() + PENDING_LOGIN_TTL_MS),
        });
        return { requiresConfirmation: true, confirmToken } as unknown as IAuthTokens;
      }
    }
    // ─────────────────────────────────────────────────────────────

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

  async forgotPassword(identifier: string): Promise<string> {
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      return "If the email or mobile number is registered, a verification code will be sent";
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

    if (user.email) {
      await this.mailService.sendEmail({
        to: user.email,
        subject: "كود إعادة تعيين كلمة المرور - منصة البناوي",
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
            <h2 style="text-align: center; color: #0f172a; margin: 0 0 12px;">إعادة تعيين كلمة المرور</h2>
            <p style="text-align: center; color: #475569; font-size: 15px; line-height: 1.7;">استخدم الكود التالي لإعادة تعيين كلمة المرور. الكود صالح لمدة 15 دقيقة.</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 12px; padding: 12px 24px;" dir="ltr">${verificationCode}</span>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 13px;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p>
          </div>
        `,
      });
    } else {
      // In production, send SMS with verificationCode
      console.warn("Development: verification code generated (check console for PW reset flow)");
    }

    return "If the email or mobile number is registered, a verification code will be sent";
  }

  async resetPassword(dto: ResetPasswordDto): Promise<string> {
    const user = await this.findUserByIdentifier(dto.identifier);

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

  async confirmNewDevice(
    confirmToken: string,
  ): Promise<IAuthTokens> {
    const pending = this.pendingLogins.get(confirmToken);
    if (!pending || pending.expiresAt < new Date()) {
      this.pendingLogins.delete(confirmToken);
      throw new UnauthorizedException("Confirmation token expired or invalid");
    }
    this.pendingLogins.delete(confirmToken);

    // Delete old sessions
    await this.prisma.session.deleteMany({
      where: { id: { in: pending.oldSessionIds } },
    });

    const tokenExpiry = pending.rememberMe
      ? ACCESS_TOKEN_REMEMBER_ME_EXPIRY
      : ACCESS_TOKEN_EXPIRY;
    return this.generateTokens(pending.userId, pending.role, tokenExpiry);
  }

  async cancelNewDevice(confirmToken: string): Promise<void> {
    this.pendingLogins.delete(confirmToken);
  }

  async cleanupExpiredPendingLogins(): Promise<void> {
    const now = new Date();
    for (const [token, data] of this.pendingLogins.entries()) {
      if (data.expiresAt < now) {
        this.pendingLogins.delete(token);
      }
    }
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

  isAppleConfigured(): boolean {
    return Boolean(
      this.config.auth.appleClientId &&
        this.config.auth.appleTeamId &&
        this.config.auth.appleKeyId &&
        this.config.auth.applePrivateKey,
    );
  }

  getAppleAuthorizeUrl(): string | null {
    if (!this.isAppleConfigured()) {
      Logger.warn("Apple OAuth credentials not configured. Apple login disabled.", "AuthService");
      return null;
    }
    const params = new URLSearchParams({
      client_id: this.config.auth.appleClientId,
      redirect_uri: this.config.auth.appleCallbackUrl,
      response_type: "code",
      scope: "name email",
      response_mode: "query",
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async exchangeAppleCode(code: string): Promise<{ email: string; sub: string }> {
    if (!this.isAppleConfigured()) {
      throw new UnauthorizedException("Apple OAuth is not configured");
    }

    const { appleClientId, appleTeamId, appleKeyId, applePrivateKey, appleCallbackUrl } =
      this.config.auth;

    const clientSecret = this.buildAppleClientSecret({
      clientId: appleClientId,
      teamId: appleTeamId,
      keyId: appleKeyId,
      privateKey: applePrivateKey,
    });

    const body = new URLSearchParams({
      client_id: appleClientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: appleCallbackUrl,
    });

    const response = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new UnauthorizedException("Apple token exchange failed");
    }

    const payload = (await response.json()) as { id_token?: string };
    if (!payload.id_token) {
      throw new UnauthorizedException("Apple token exchange returned no id_token");
    }

    const verified = await verifyAppleIdToken(payload.id_token, appleClientId);
    const email = verified.email ?? null;
    const sub = verified.sub;

    if (!sub) {
      throw new UnauthorizedException("Apple id_token missing subject");
    }

    return { email: email ?? "", sub };
  }

  private buildAppleClientSecret(params: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKey: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: "ES256", kid: params.keyId }));
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: params.teamId,
        iat: now,
        exp: now + 300,
        aud: "https://appleid.apple.com",
        sub: params.clientId,
      }),
    );
    const signingInput = `${header}.${payload}`;
    const privateKey = createPrivateKey(params.privateKey.replaceAll("\\n", "\n"));
    const signature = sign("sha256", Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    });
    return `${signingInput}.${base64UrlEncode(signature)}`;
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
        mobileNumber: dto.mobile ?? null,
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

    if (dto.referralCode) {
      void this.referralService.applyReferral(user.id, dto.referralCode).catch((err: unknown) => {
        Logger.warn(`Referral application failed for user ${user.id}: ${err instanceof Error ? err.message : "Unknown"}`, "AuthService");
      });
    }

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
    const sessionExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
    );
    const session = await this.prisma.session.create({
      data: {
        userId,
        token: uuidv4(),
        expiresAt: sessionExpiresAt,
      },
    });

    const payload: ITokenPayload = { sub: userId, role, sessionId: session.id };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
    });

    const refreshTokenValue = uuidv4();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt: sessionExpiresAt,
      },
    });

    return {
      userId,
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: accessTokenExpiry,
      sessionId: session.id,
    };
  }

  private async findUserByIdentifier(identifier: string) {
    const isEmail = identifier.includes("@");
    const normalizedMobile = isEmail ? null : normalizeEgyptMobile(identifier);
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: isEmail ? identifier.toLowerCase() : identifier },
          ...(normalizedMobile ? [{ mobileNumber: normalizedMobile }] : []),
        ],
      },
    });
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

    const STAGE_CODE_MAP: Record<string, string> = {
      PRIMARY: "ابتدائي",
      PREPARATORY: "إعدادي",
      SECONDARY: "ثانوي",
    };

    let gradeId: string | null = null;
    if (educationalStage && grade) {
      const stageName = STAGE_CODE_MAP[educationalStage.toUpperCase()] ?? educationalStage;
      const stage = await this.prisma.stage.findFirst({
        where: { name: { equals: stageName, mode: "insensitive" } },
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

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}
