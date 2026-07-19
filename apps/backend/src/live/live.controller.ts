import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { LiveService } from "./live.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  BookSessionDto,
  BookBySlotDto,
  RecordAttendanceDto,
  CreateTeacherAvailabilityDto,
  CreateSubscriptionDto,
  CreateAnnouncementDto,
  BlockDateDto,
  AvailableSlotQueryDto,
} from "./dto/live.dto";

@Controller("live")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get("sessions")
  async listSessions(): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getSessions();
    return successResponse(data);
  }

  @Get("sessions/:id")
  async getSession(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.getSession(id);
    return successResponse(data);
  }

  @Post("sessions")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createSession(
    @CurrentUser() userId: string,
    @Body() dto: CreateLiveSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.createSession(dto);
    return successResponse(data, "Session created");
  }

  @Patch("sessions/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateLiveSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.updateSession(id, userId, role, dto as never);
    return successResponse(data, "Session updated");
  }

  @Delete("sessions/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.live.resolveRole(userId);
    await this.live.deleteSession(id, userId, role);
    return successResponse(null, "Session deleted");
  }

  @Post("sessions/:id/publish")
  @Roles("ADMINISTRATOR", "TEACHER")
  async publishSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.publishSession(id, userId, role);
    return successResponse(data, "Session published");
  }

  @Post("sessions/:id/unpublish")
  @Roles("ADMINISTRATOR", "TEACHER")
  async unpublishSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.unpublishSession(id, userId, role);
    return successResponse(data, "Session unpublished");
  }

  @Post("sessions/:id/start")
  @Roles("ADMINISTRATOR", "TEACHER")
  async startSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.startSession(id, userId, role);
    return successResponse(data, "Session started");
  }

  @Post("sessions/:id/end")
  @Roles("ADMINISTRATOR", "TEACHER")
  async endSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.endSession(id, userId, role);
    return successResponse(data, "Session ended");
  }

  @Get("sessions/:id/control-panel")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getControlPanel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.getControlPanel(id, userId, role);
    return successResponse(data);
  }

  @Get("sessions/:id/announcements")
  async listAnnouncements(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getAnnouncements(id);
    return successResponse(data);
  }

  @Post("sessions/:id/announcements")
  @Roles("ADMINISTRATOR", "TEACHER")
  async sendAnnouncement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.sendAnnouncement(id, userId, dto);
    return successResponse(data, "Announcement sent");
  }

  @Delete("sessions/:id/participants/:studentId")
  @Roles("ADMINISTRATOR", "TEACHER")
  async removeParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.live.resolveRole(userId);
    await this.live.removeParticipant(id, studentId, userId, role);
    return successResponse(null, "Participant removed");
  }

  @Patch("sessions/:id/settings")
  @Roles("ADMINISTRATOR", "TEACHER")
  async overrideSettings(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() settings: Record<string, unknown>,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.overrideSettings(id, userId, role, settings);
    return successResponse(data);
  }

  @Get("sessions/:id/control-logs")
  @Roles("ADMINISTRATOR", "TEACHER")
  async listControlLogs(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getControlLogs(id);
    return successResponse(data);
  }

  @Post("sessions/:id/attendance")
  @Roles("ADMINISTRATOR", "TEACHER")
  async recordAttendance(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: RecordAttendanceDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.recordAttendance({
      sessionId: id,
      studentId: dto.studentId,
      status: dto.status,
      notes: dto.notes,
      markedById: userId,
    });
    return successResponse(data, "Attendance recorded");
  }

  @Get("my-bookings")
  async listMyBookings(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getMyBookings(userId);
    return successResponse(data);
  }

  @Post("sessions/:id/book")
  async bookSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: BookSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.bookSession(userId, { sessionId: id, subscriptionId: dto.subscriptionId });
    return successResponse(data, "Booked");
  }

  @Delete("bookings/:id")
  async cancelBooking(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.live.resolveRole(userId);
    await this.live.cancelBooking(id, userId, role);
    return successResponse(null, "Booking cancelled");
  }

  @Get("subscriptions")
  async listSubscriptions(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getSubscriptions(userId);
    return successResponse(data);
  }

  @Post("subscriptions")
  async createSubscription(
    @CurrentUser() userId: string,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.createSubscription(userId, { teacherId: dto.teacherId, type: dto.type });
    return successResponse(data, "Subscription created");
  }

  @Patch("subscriptions/:id")
  async updateSubscription(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: { type?: string; status?: string; isActive?: boolean },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.updateSubscription(id, dto);
    return successResponse(data, "Subscription updated");
  }

  @Get("availability")
  async listAvailability(@Query("teacherId") teacherId?: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getAvailabilities(teacherId);
    return successResponse(data);
  }

  @Post("availability")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createAvailability(
    @CurrentUser() userId: string,
    @Body() dto: CreateTeacherAvailabilityDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.createAvailability({
      teacherId: dto.teacherId ?? userId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      gradeId: dto.gradeId,
      maxStudents: dto.maxStudents,
      type: dto.type,
      isRecurring: dto.isRecurring,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });
    return successResponse(data, "Availability created");
  }

  @Patch("availability/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateAvailability(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: Record<string, unknown>,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.live.resolveRole(userId);
    const data = await this.live.updateAvailability(id, userId, role, dto);
    return successResponse(data, "Availability updated");
  }

  @Delete("availability/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteAvailability(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.live.resolveRole(userId);
    await this.live.deleteAvailability(id, userId, role);
    return successResponse(null, "Availability deleted");
  }

  @Get("availability/calendar")
  async getAvailableSlots(@Query() query: AvailableSlotQueryDto): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getAvailableSlots(query);
    return successResponse(data);
  }

  @Post("availability/calendar/:slotId/book")
  async bookBySlot(
    @Param("slotId") slotId: string,
    @CurrentUser() userId: string,
    @Body() dto: BookBySlotDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.bookBySlot(userId, slotId, dto);
    return successResponse(data, "Booked");
  }

  @Get("date-blocks")
  async listDateBlocks(@Query("teacherId") teacherId?: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.live.getDateBlocks(teacherId);
    return successResponse(data);
  }

  @Post("date-blocks")
  @Roles("ADMINISTRATOR", "TEACHER")
  async blockDate(
    @CurrentUser() userId: string,
    @Body() dto: BlockDateDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.live.blockDate(userId, dto);
    return successResponse(data, "Date blocked");
  }

  @Delete("date-blocks/:id")
  async unblockDate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.live.resolveRole(userId);
    await this.live.unblockDate(id, userId, role);
    return successResponse(null, "Date unblocked");
  }
}
