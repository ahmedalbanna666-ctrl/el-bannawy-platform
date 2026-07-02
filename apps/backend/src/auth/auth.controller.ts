import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService, type IAuthTokens } from "./auth.service";
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import type { Request } from "express";

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
    mobileNumber: string;
    role: string;
    status: string;
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
  async deleteSession(@CurrentUser() userId: string, @Param("id") sessionId: string): Promise<void> {
    await this.authService.deleteSession(userId, sessionId);
  }
}
