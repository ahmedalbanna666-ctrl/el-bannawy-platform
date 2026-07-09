import { Controller, Get, Post, Patch, Delete, Param, ParseUUIDPipe, Body, Query, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SendNotificationDto, ScheduleNotificationDto, UpdatePreferencesDto } from "./dto/notification.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser() userId: string,
    @Query("filter") filter?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.notificationsService.getNotifications(userId, filter);
    return successResponse(data, "Notifications retrieved successfully");
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
  scheduleNotification(
    @CurrentUser() userId: string,
    @Body() dto: ScheduleNotificationDto,
  ): ISuccessResponse<unknown> {
    const data = this.notificationsService.scheduleNotification(userId, dto);
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
