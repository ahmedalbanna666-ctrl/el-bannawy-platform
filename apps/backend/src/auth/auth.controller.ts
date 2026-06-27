import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { Request } from "express";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<{
    success: boolean;
    message: string;
    data: { userId: string; status: string };
  }> {
    const result = await this.authService.register(dto);
    return {
      success: true,
      message: "Account created successfully.",
      data: result,
    };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<{
    success: boolean;
    data: { accessToken: string; refreshToken: string; expiresIn: number };
  }> {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];
    const result = await this.authService.login(dto, ipAddress, userAgent);
    return {
      success: true,
      data: result,
    };
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
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<{
    success: boolean;
    data: { accessToken: string; refreshToken: string; expiresIn: number };
  }> {
    const tokens = await this.authService.refreshToken(dto);
    return { success: true, data: tokens };
  }

  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.forgotPassword(dto.mobile);
    return { success: true, ...result };
  }

  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.resetPassword(dto);
    return { success: true, ...result };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string): Promise<{
    success: boolean;
    data: { id: string; fullName: string; mobileNumber: string; role: string; status: string };
  }> {
    const user = await this.authService.getMe(userId);
    return {
      success: true,
      data: user,
    };
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() userId: string): Promise<{
    success: boolean;
    data: { id: string; createdAt: Date; expiresAt: Date }[];
  }> {
    const sessions = await this.authService.getSessions(userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @CurrentUser() userId: string,
    @Param("id") sessionId: string,
  ): Promise<void> {
    await this.authService.deleteSession(userId, sessionId);
  }
}
