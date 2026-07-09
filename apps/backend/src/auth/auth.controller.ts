import { Controller, Post, Get, Delete, Body, Param, ParseUUIDPipe, Req, UseGuards, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { AuthService, type IAuthTokens } from "./auth.service";
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, CompleteOAuthRegistrationDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import type { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<ISuccessResponse<IAuthTokens>> {
    const result = await this.authService.register(dto);
    return successResponse(result, "Account created successfully.");
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<ISuccessResponse<IAuthTokens>> {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];
    const result = await this.authService.login(dto, ipAddress, userAgent);
    return successResponse(result, "Login successful");
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleAuth(): void {}

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const googleProfile = req.user as { email: string | null; googleId: string } | undefined;

    if (!googleProfile?.email) {
      res.redirect(`${process.env.FRONTEND_URL ?? "http://localhost:3000"}/login?error=google_no_email`);
      return;
    }

    const result = await this.authService.oauthLogin({
      email: googleProfile.email,
      providerId: googleProfile.googleId,
      provider: "google",
    });

    if (result.type === "existing") {
      res.redirect(
        `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard?token=${result.accessToken}&refreshToken=${result.refreshToken}&expiresIn=${String(result.expiresIn)}`,
      );
    } else {
      res.redirect(
        `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/register?oauth=google&token=${result.accessToken}&email=${encodeURIComponent(googleProfile.email)}&expiresIn=${String(result.expiresIn)}`,
      );
    }
  }

  @Post("complete-oauth-registration")
  async completeOAuthRegistration(
    @Body() dto: CompleteOAuthRegistrationDto,
  ): Promise<ISuccessResponse<IAuthTokens>> {
    const result = await this.authService.completeOAuthRegistration(dto);
    return successResponse(result, "Google account linked. Registration complete.");
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() userId: string, @Req() req: Request): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") ?? "";
    await this.authService.logout(userId, token);
  }

  @Post("refresh-token")
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<ISuccessResponse<IAuthTokens>> {
    const tokens = await this.authService.refreshToken(dto);
    return successResponse(tokens, "Token refreshed successfully");
  }

  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ISuccessResponse<null>> {
    const message = await this.authService.forgotPassword(dto.mobile);
    return successResponse(null, message);
  }

  @Post("reset-password")
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
