import { Controller, Post, Get, Delete, Body, Param, Query, ParseUUIDPipe, Req, UseGuards, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService, type IAuthTokens, type IRequiresConfirmation } from "./auth.service";
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, CompleteOAuthRegistrationDto, VerifyEmailDto, ResendVerificationDto, FirebaseLoginDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { ConfigurationService } from "../config/configuration.service";
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from "../common/helpers/cookie.helper";
import type { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigurationService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() dto: RegisterDto): Promise<ISuccessResponse<{ userId: string; requiresEmailVerification: boolean }>> {
    const result = await this.authService.register(dto);
    return successResponse(result, "Account created. Please verify your email.");
  }

  @Post("verify-email")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ISuccessResponse<{ verified: boolean; email: string }>> {
    const result = await this.authService.verifyEmail(dto);
    return successResponse(result, "Email verified successfully");
  }

  @Post("resend-verification")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<ISuccessResponse<{ sent: boolean }>> {
    const result = await this.authService.resendVerification(dto);
    return successResponse(result, result.sent ? "Verification code sent" : "No pending verification");
  }

  @Post("firebase-login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async firebaseLogin(@Body() dto: FirebaseLoginDto, @Res({ passthrough: true }) res: Response): Promise<ISuccessResponse<{ userId: string }>> {
    const result = await this.authService.firebaseLogin(dto);
    setAuthCookies(res, result.accessToken, result.refreshToken, result.expiresIn);
    return successResponse({ userId: result.userId }, "Login successful");
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<ISuccessResponse<{ userId: string } | { requiresConfirmation: boolean }>> {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];
    const result = await this.authService.login(dto, ipAddress, userAgent);
    if ("requiresConfirmation" in result && (result as IRequiresConfirmation).requiresConfirmation) {
      return successResponse(
        { requiresConfirmation: true, confirmToken: (result as IRequiresConfirmation).confirmToken },
        "Device confirmation required",
      );
    }
    const tokens = result as IAuthTokens;
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return successResponse({ userId: tokens.userId }, "Login successful");
  }

  @Get("account-status")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async accountStatus(
    @Query("identifier") identifier?: string,
  ): Promise<ISuccessResponse<{ status: string; whatsapp: string | null; message: string | null }>> {
    const value = (identifier ?? "").trim();
    if (!value) {
      return successResponse({ status: "ACTIVE", whatsapp: null, message: null }, "Account status retrieved");
    }
    const data = await this.authService.getAccountStatus(value);
    return successResponse(data, "Account status retrieved");
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {}

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const googleProfile = req.user as { email: string | null; googleId: string } | undefined;

    if (!googleProfile?.email) {
      res.redirect(`${this.config.app.frontendUrl}/login?error=google_no_email`);
      return;
    }

    const result = await this.authService.oauthLogin({
      email: googleProfile.email,
      providerId: googleProfile.googleId,
      provider: "google",
    });

    setAuthCookies(res, result.accessToken, result.refreshToken, result.expiresIn);

    if (result.type === "existing") {
      res.redirect(`${this.config.app.frontendUrl}/dashboard`);
    } else {
      res.redirect(
        `${this.config.app.frontendUrl}/register?oauth=google&email=${encodeURIComponent(googleProfile.email)}`,
      );
    }
  }

  @Get("apple")
  appleAuth(@Res() res: Response): void {
    const url = this.authService.getAppleAuthorizeUrl();
    if (!url) {
      res.redirect(`${this.config.app.frontendUrl}/login?error=apple_not_configured`);
      return;
    }
    res.redirect(url);
  }

  @Get("apple/callback")
  async appleAuthCallback(
    @Query("code") code: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.config.app.frontendUrl;

    if (error || !code) {
      res.redirect(`${frontendUrl}/login?error=apple_callback_failed`);
      return;
    }

    try {
      const profile = await this.authService.exchangeAppleCode(code);

      if (!profile.email) {
        res.redirect(`${frontendUrl}/login?error=apple_no_email`);
        return;
      }

      const result = await this.authService.oauthLogin({
        email: profile.email,
        providerId: profile.sub,
        provider: "apple",
      });

      setAuthCookies(res, result.accessToken, result.refreshToken, result.expiresIn);

      if (result.type === "existing") {
        res.redirect(`${frontendUrl}/dashboard`);
      } else {
        res.redirect(
          `${frontendUrl}/register?oauth=apple&email=${encodeURIComponent(profile.email)}`,
        );
      }
    } catch {
      res.redirect(`${frontendUrl}/login?error=apple_callback_failed`);
    }
  }

  @Post("complete-oauth-registration")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async completeOAuthRegistration(
    @Body() dto: CompleteOAuthRegistrationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ISuccessResponse<{ userId: string }>> {
    const result = await this.authService.completeOAuthRegistration(dto);
    setAuthCookies(res, result.accessToken, result.refreshToken, result.expiresIn);
    return successResponse({ userId: result.userId }, "Registration complete.");
  }

  @Post("confirm-login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async confirmLogin(@Body() body: { confirmToken: string }, @Res({ passthrough: true }) res: Response): Promise<ISuccessResponse<{ userId: string }>> {
    const result = await this.authService.confirmNewDevice(body.confirmToken);
    setAuthCookies(res, result.accessToken, result.refreshToken, result.expiresIn);
    return successResponse({ userId: result.userId }, "Login confirmed");
  }

  @Post("cancel-login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async cancelLogin(@Body() body: { confirmToken: string }): Promise<ISuccessResponse<null>> {
    await this.authService.cancelNewDevice(body.confirmToken);
    return successResponse(null, "Login cancelled");
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() userId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<ISuccessResponse<null>> {
    const signedCookies = req.signedCookies as Record<string, string> | undefined;
    const refreshToken = signedCookies?.[REFRESH_TOKEN_COOKIE] ?? (req.body as Record<string, string | undefined>)?.refreshToken ?? "";
    await this.authService.logout(userId, refreshToken);
    clearAuthCookies(res);
    return successResponse(null, "Logged out successfully");
  }

  @Post("refresh-token")
  @UseGuards(CsrfGuard)
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<ISuccessResponse<null>> {
    const signedCookies = req.signedCookies as Record<string, string> | undefined;
    const refreshToken = signedCookies?.[REFRESH_TOKEN_COOKIE] ?? (req.body as Record<string, string | undefined>)?.refreshToken ?? "";
    const tokens = await this.authService.refreshToken({ refreshToken });
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return successResponse(null, "Token refreshed successfully");
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ISuccessResponse<null>> {
    const message = await this.authService.forgotPassword(dto.identifier);
    return successResponse(null, message);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ISuccessResponse<null>> {
    const message = await this.authService.resetPassword(dto);
    return successResponse(null, message);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string): Promise<ISuccessResponse<{
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
  }>> {
    const user = await this.authService.getMe(userId);
    return successResponse(user, "User profile retrieved");
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() userId: string): Promise<ISuccessResponse<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
  }[]>> {
    const sessions = await this.authService.getSessions(userId);
    return successResponse(sessions, "Sessions retrieved");
  }

  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) sessionId: string): Promise<void> {
    await this.authService.deleteSession(userId, sessionId);
  }
}
