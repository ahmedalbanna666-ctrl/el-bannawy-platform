import { Controller, Get, Post, Patch, Delete, Param, ParseUUIDPipe, Body, Query, UseGuards, Headers } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { WhatsAppService } from "./whatsapp.service";
import { FcmService } from "./fcm.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, paginatedResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SendNotificationDto, ScheduleNotificationDto, UpdatePreferencesDto } from "./dto/notification.dto";
import {
  UpdateNotificationConfigDto,
  UpdateNotificationTemplateDto,
  UpdateWhatsAppConfigDto,
  SendTestWhatsAppDto,
} from "./dto/admin-notification.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly whatsAppService: WhatsAppService,
    private readonly fcmService: FcmService,
  ) {}

  // ── Admin: Config ────────────────────────────────────────────────────

  @Get("admin/config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getConfigs(): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getNotificationConfigs();
    return successResponse(data, "Notification configs retrieved");
  }

  @Patch("admin/config/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateConfig(
    @Param("key") key: string,
    @Body() dto: UpdateNotificationConfigDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.updateNotificationConfig(key, dto);
    return successResponse(data, "Notification config updated");
  }

  // ── Admin: Templates ─────────────────────────────────────────────────

  @Get("admin/templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getTemplates(): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getNotificationTemplates();
    return successResponse(data, "Notification templates retrieved");
  }

  @Patch("admin/templates/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateTemplate(
    @Param("key") key: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.updateNotificationTemplate(key, dto);
    return successResponse(data, "Notification template updated");
  }

  // ── Admin: WhatsApp ──────────────────────────────────────────────────

  @Get("admin/whatsapp")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getWhatsAppConfig(): Promise<ISuccessResponse<unknown>> {
    const data = await this.whatsAppService.getConfig();
    return successResponse(data, "WhatsApp config retrieved");
  }

  @Patch("admin/whatsapp")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateWhatsAppConfig(@Body() dto: UpdateWhatsAppConfigDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.whatsAppService.updateConfig(dto as Record<string, unknown>);
    return successResponse(data, "WhatsApp config updated");
  }

  @Get("admin/whatsapp/logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getWhatsAppLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.whatsAppService.getLogs(Number(page) || 1, Number(limit) || 20);
    const meta = (data as { meta: unknown }).meta;
    return paginatedResponse((data as { data: unknown[] }).data, meta as { page: number; limit: number; total: number; totalPages: number }, "WhatsApp logs retrieved");
  }

  @Post("admin/whatsapp/test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async sendTestWhatsApp(@Body() dto: SendTestWhatsAppDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.whatsAppService.sendTestMessage(dto.to, dto.message);
    return successResponse(data, "Test message sent");
  }

  // ── User: Notifications ──────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser() userId: string,
    @Query("filter") filter?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const result = await this.notificationsService.getNotifications(userId, filter, Number(page) || 1, Number(limit) || 20);
    return paginatedResponse(
      (result as { data: unknown[] }).data,
      (result as { meta: { page: number; limit: number; total: number; totalPages: number } }).meta,
      "Notifications retrieved successfully",
    );
  }

  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getUnreadCount(userId);
    return successResponse(data, "Unread count retrieved");
  }

  @Post("device-token")
  @UseGuards(JwtAuthGuard)
  async registerDeviceToken(
    @CurrentUser() userId: string,
    @Body("token") token: string,
    @Body("platform") platform: string | undefined,
    @Headers("user-agent") userAgent: string | undefined,
  ): Promise<ISuccessResponse<unknown>> {
    await this.fcmService.registerToken(userId, token, platform, userAgent);
    return successResponse(null, "Device token registered");
  }

  @Delete("device-token")
  @UseGuards(JwtAuthGuard)
  async unregisterDeviceToken(
    @CurrentUser() userId: string,
    @Body("token") token: string,
  ): Promise<ISuccessResponse<unknown>> {
    await this.fcmService.unregisterToken(userId, token);
    return successResponse(null, "Device token unregistered");
  }

  @Get("preferences")
  @UseGuards(JwtAuthGuard)
  async getPreferences(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getPreferences(userId);
    return successResponse(data, "Preferences retrieved successfully");
  }

  @Patch("preferences")
  @UseGuards(JwtAuthGuard)
  async updatePreferences(
    @CurrentUser() userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.updatePreferences(userId, dto);
    return successResponse(data, "Preferences updated successfully");
  }

  @Patch("read-all")
  @UseGuards(JwtAuthGuard)
  async markAllRead(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.markAllRead(userId);
    return successResponse(data, "All notifications marked as read");
  }

  @Get("analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getAnalytics(): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getAnalytics();
    return successResponse(data, "Analytics retrieved");
  }

  @Post("send")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "SECRETARY", "ADMINISTRATOR")
  async sendNotification(
    @CurrentUser() userId: string,
    @Body() dto: SendNotificationDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.sendNotification(userId, dto);
    return successResponse(data, "Notification sent");
  }

  @Post("schedule")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async scheduleNotification(
    @CurrentUser() userId: string,
    @Body() dto: ScheduleNotificationDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.scheduleNotification(userId, dto);
    return successResponse(data, "Notification scheduled");
  }

  @Get(":notificationId")
  @UseGuards(JwtAuthGuard)
  async getNotification(@Param("notificationId", ParseUUIDPipe) notificationId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getNotification(notificationId);
    return successResponse(data, "Notification retrieved");
  }

  @Patch(":notificationId/read")
  @UseGuards(JwtAuthGuard)
  async markRead(
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.markRead(notificationId, userId);
    return successResponse(data, "Notification marked as read");
  }

  @Delete(":notificationId")
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.deleteNotification(notificationId, userId);
    return successResponse(data, "Notification deleted");
  }
}
