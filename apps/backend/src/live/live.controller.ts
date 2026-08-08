import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import type { Request } from "express";
import { LiveAccessService } from "./live-access.service";
import { LiveSessionService } from "./live-session.service";
import { LiveBookingService } from "./live-booking.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { LiveControlPanelService } from "./live-control-panel.service";
import { LiveAttendanceService } from "./live-attendance.service";
import { LiveZoomMeetingService } from "./live-zoom-meeting.service";
import { LiveWaitingListService } from "./live-waitlist.service";
import { LiveRecurringBookingService } from "./live-recurring-booking.service";
import { LiveReportsService } from "./live-reports.service";
import { LiveAnalyticsService } from "./live-analytics.service";
import { LiveDashboardService } from "./live-dashboard.service";
import { LiveProductPricingService } from "./live-product-pricing.service";
import { StudyScheduleService } from "./study-schedule.service";
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
  CreateZoomMeetingDto,
  UpdateZoomMeetingDto,
  JoinSessionDto,
  RequestRescheduleDto,
  RescheduleDecisionDto,
  RecurringBookDto,
  ProductReportQueryDto,
  AnalyticsQueryDto,
  CreateStudyScheduleDto,
  UpdateStudyScheduleDto,
  CreateLivePricingPlanDto,
  UpdateLivePricingPlanDto,
} from "./dto/live.dto";

@Controller("live")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveController {
  constructor(
    private readonly access: LiveAccessService,
    private readonly sessions: LiveSessionService,
    private readonly bookings: LiveBookingService,
    private readonly subscriptions: LiveSubscriptionService,
    private readonly availability: LiveAvailabilityService,
    private readonly controlPanel: LiveControlPanelService,
    private readonly attendance: LiveAttendanceService,
    private readonly zoomMeetings: LiveZoomMeetingService,
    private readonly waitlist: LiveWaitingListService,
    private readonly recurringBookings: LiveRecurringBookingService,
    private readonly reports: LiveReportsService,
    private readonly analytics: LiveAnalyticsService,
    private readonly dashboard: LiveDashboardService,
    private readonly pricing: LiveProductPricingService,
    private readonly studySchedules: StudyScheduleService,
  ) {}

  @Get("sessions")
  async listSessions(
    @CurrentUser() userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.getSessions(Number(page) || 1, Number(limit) || 20, userId, role);
    return successResponse(data);
  }

  @Get("sessions/by-lesson/:lessonId")
  async getLessonSessions(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.sessions.getLessonSessions(lessonId, userId);
    return successResponse(data);
  }

  @Get("sessions/:id")
  async getSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.getSession(id, userId, role);
    return successResponse(data);
  }

  @Get("sessions/:id/attendance")
  @Roles("ADMINISTRATOR", "TEACHER", "SECRETARY")
  async getSessionAttendance(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.attendance.getSessionAttendance(id, userId, role);
    return successResponse(data);
  }

  @Post("sessions/:id/zoom-meeting")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createZoomMeeting(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateZoomMeetingDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.zoomMeetings.createZoomMeeting(id, userId, role, dto);
    return successResponse(data, "Zoom meeting created");
  }

  @Patch("sessions/:id/zoom-meeting")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateZoomMeeting(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateZoomMeetingDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.zoomMeetings.updateZoomMeeting(id, userId, role, dto);
    return successResponse(data, "Zoom meeting updated");
  }

  @Delete("sessions/:id/zoom-meeting")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteZoomMeeting(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.zoomMeetings.deleteZoomMeeting(id, userId, role);
    return successResponse(null, "Zoom meeting deleted");
  }

  @Post("sessions/:id/join")
  async joinSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: JoinSessionDto,
    @Req() req: Request,
  ): Promise<ISuccessResponse<unknown>> {
    const ip = this.resolveClientIp(req);
    const data = await this.attendance.requestJoin(id, userId, dto.device ?? null, ip);
    return successResponse(data, "Join allowed");
  }

  @Post("sessions/:id/leave")
  async leaveSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.attendance.requestLeave(id, userId);
    return successResponse(data, "Attendance updated");
  }

  @Post("sessions")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createSession(
    @CurrentUser() userId: string,
    @Body() dto: CreateLiveSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.sessions.createSession(dto);
    return successResponse(data, "Session created");
  }

  @Patch("sessions/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateLiveSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.updateSession(id, userId, role, dto as Record<string, unknown>);
    return successResponse(data, "Session updated");
  }

  @Delete("sessions/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.sessions.deleteSession(id, userId, role);
    return successResponse(null, "Session deleted");
  }

  @Post("sessions/:id/publish")
  @Roles("ADMINISTRATOR", "TEACHER")
  async publishSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.publishSession(id, userId, role);
    return successResponse(data, "Session published");
  }

  @Post("sessions/:id/unpublish")
  @Roles("ADMINISTRATOR", "TEACHER")
  async unpublishSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.unpublishSession(id, userId, role);
    return successResponse(data, "Session unpublished");
  }

  @Post("sessions/:id/start")
  @Roles("ADMINISTRATOR", "TEACHER")
  async startSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.startSession(id, userId, role);
    return successResponse(data, "Session started");
  }

  @Post("sessions/:id/end")
  @Roles("ADMINISTRATOR", "TEACHER")
  async endSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.sessions.endSession(id, userId, role);
    return successResponse(data, "Session ended");
  }

  @Get("sessions/:id/control-panel")
  @Roles("ADMINISTRATOR", "TEACHER", "SECRETARY")
  async getControlPanel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.controlPanel.getControlPanel(id, userId, role);
    return successResponse(data);
  }

  @Get("sessions/:id/announcements")
  async listAnnouncements(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.controlPanel.getAnnouncements(id);
    return successResponse(data);
  }

  @Post("sessions/:id/announcements")
  @Roles("ADMINISTRATOR", "TEACHER")
  async sendAnnouncement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.controlPanel.sendAnnouncement(id, userId, role, dto);
    return successResponse(data, "Announcement sent");
  }

  @Delete("sessions/:id/participants/:studentId")
  @Roles("ADMINISTRATOR", "TEACHER")
  async removeParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.bookings.removeParticipant(id, studentId, userId, role);
    return successResponse(null, "Participant removed");
  }

  @Patch("sessions/:id/settings")
  @Roles("ADMINISTRATOR", "TEACHER")
  async overrideSettings(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() settings: Record<string, unknown>,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.controlPanel.overrideSettings(id, userId, role, settings);
    return successResponse(data);
  }

  @Get("sessions/:id/control-logs")
  @Roles("ADMINISTRATOR", "TEACHER")
  async listControlLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.controlPanel.getControlLogs(id, userId, role);
    return successResponse(data);
  }

  @Post("sessions/:id/attendance")
  @Roles("ADMINISTRATOR", "TEACHER")
  async recordAttendance(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: RecordAttendanceDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.attendance.recordAttendance({
      sessionId: id,
      studentId: dto.studentId,
      status: dto.status,
      notes: dto.notes,
      markedById: userId,
      role,
    });
    return successResponse(data, "Attendance recorded");
  }

  @Get("my-bookings")
  async listMyBookings(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.bookings.getMyBookings(userId);
    return successResponse(data);
  }

  @Post("sessions/:id/book")
  async bookSession(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: BookSessionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.bookings.bookSession(userId, { sessionId: id, subscriptionId: dto.subscriptionId });
    return successResponse(data, "Booked");
  }

  @Delete("bookings/:id")
  async cancelBooking(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.bookings.cancelBooking(id, userId, role);
    return successResponse(null, "Booking cancelled");
  }

  @Post("bookings/:id/reschedule-request")
  async requestReschedule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: RequestRescheduleDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.bookings.requestReschedule(id, userId, { reason: dto.reason });
    return successResponse(data, "Reschedule requested");
  }

  @Patch("bookings/:id/reschedule-decision")
  @Roles("ADMINISTRATOR", "TEACHER")
  async decideReschedule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: RescheduleDecisionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.bookings.decideReschedule(id, userId, role, { decision: dto.decision });
    return successResponse(data, "Reschedule decision recorded");
  }

  @Get("my-waitlist")
  async listMyWaitlist(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.waitlist.getMyEntries(userId);
    return successResponse(data);
  }

  @Post("sessions/:id/waitlist")
  async joinWaitlist(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.waitlist.join(userId, id);
    return successResponse(data, "Joined waiting list");
  }

  @Delete("sessions/:id/waitlist")
  async leaveWaitlist(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    await this.waitlist.leave(userId, id);
    return successResponse(null, "Left waiting list");
  }

  @Get("sessions/:id/waitlist")
  @Roles("ADMINISTRATOR", "TEACHER", "SECRETARY")
  async listSessionWaitlist(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.waitlist.getSessionEntries(id, userId, role);
    return successResponse(data);
  }

  @Get("subscriptions")
  async listSubscriptions(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.subscriptions.getSubscriptions(userId);
    return successResponse(data);
  }

  @Post("subscriptions")
  async createSubscription(
    @CurrentUser() userId: string,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.subscriptions.createSubscription(userId, { teacherId: dto.teacherId, type: dto.type });
    return successResponse(data, "Subscription created");
  }

  @Patch("subscriptions/:id")
  async updateSubscription(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: { type?: string; status?: string; isActive?: boolean },
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.subscriptions.updateSubscription(id, userId, role, dto);
    return successResponse(data, "Subscription updated");
  }

  @Get("availability")
  async listAvailability(@Query("teacherId") teacherId?: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.availability.getAvailabilities(teacherId);
    return successResponse(data);
  }

  @Post("availability")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createAvailability(
    @CurrentUser() userId: string,
    @Body() dto: CreateTeacherAvailabilityDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.availability.createAvailability({
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
    const role = await this.access.resolveRole(userId);
    const data = await this.availability.updateAvailability(id, userId, role, dto);
    return successResponse(data, "Availability updated");
  }

  @Delete("availability/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteAvailability(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.availability.deleteAvailability(id, userId, role);
    return successResponse(null, "Availability deleted");
  }

  @Get("availability/calendar")
  async getAvailableSlots(
    @Query() query: AvailableSlotQueryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.availability.getAvailableSlots(query, userId);
    return successResponse(data);
  }

  @Post("availability/calendar/:slotId/book")
  async bookBySlot(
    @Param("slotId") slotId: string,
    @CurrentUser() userId: string,
    @Body() dto: BookBySlotDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.bookings.bookBySlot(userId, slotId, dto);
    return successResponse(data, "Booked");
  }

  @Post("availability/calendar/:slotId/recurring-book")
  async bookRecurringSeries(
    @Param("slotId") slotId: string,
    @CurrentUser() userId: string,
    @Body() dto: RecurringBookDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.recurringBookings.bookSeries(userId, slotId, dto);
    return successResponse(data, "Recurring series booked");
  }

  // ── Study schedules ────────────────────────────────────────────────────

  @Get("schedules")
  async listSchedules(
    @CurrentUser() userId: string,
    @Query("teacherId") teacherId?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.studySchedules.listSchedules(userId, role, teacherId);
    return successResponse(data);
  }

  @Get("schedules/:id")
  async getSchedule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.studySchedules.getSchedule(id, userId, role);
    return successResponse(data);
  }

  @Post("schedules")
  @Roles("ADMINISTRATOR", "TEACHER")
  async createSchedule(
    @CurrentUser() userId: string,
    @Body() dto: CreateStudyScheduleDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.studySchedules.createSchedule(userId, role, dto);
    return successResponse(data, "Study schedule created");
  }

  @Patch("schedules/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateSchedule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateStudyScheduleDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.studySchedules.updateSchedule(id, userId, role, dto as Record<string, unknown>);
    return successResponse(data, "Study schedule updated");
  }

  @Delete("schedules/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteSchedule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.studySchedules.deleteSchedule(id, userId, role);
    return successResponse(null, "Study schedule deleted");
  }

  // ── Live product pricing ───────────────────────────────────────────────

  @Get("products/plans")
  async getProductPlans(): Promise<ISuccessResponse<unknown>> {
    const data = await this.pricing.getPlans(false);
    return successResponse(data);
  }

  @Post("products/plans")
  @Roles("ADMINISTRATOR")
  async createProductPlan(
    @CurrentUser() userId: string,
    @Body() dto: CreateLivePricingPlanDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.pricing.createPlan(userId, role, dto);
    return successResponse(data, "Live plan created");
  }

  @Patch("products/plans/:code")
  @Roles("ADMINISTRATOR")
  async updateProductPlan(
    @Param("code") code: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateLivePricingPlanDto,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.pricing.updatePlan(userId, role, code, dto);
    return successResponse(data, "Live plan updated");
  }

  @Delete("products/plans/:code")
  @Roles("ADMINISTRATOR")
  async deleteProductPlan(
    @Param("code") code: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.pricing.deletePlan(userId, role, code);
    return successResponse(null, "Live plan deleted");
  }

  @Get("products/pricing")
  async getProductPricing(): Promise<ISuccessResponse<unknown>> {
    const data = await this.pricing.getPrices();
    return successResponse(data);
  }

  @Put("products/pricing")
  @Roles("ADMINISTRATOR")
  async updateProductPricing(
    @CurrentUser() userId: string,
    @Body() prices: Record<string, number>,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const data = await this.pricing.updatePrices(userId, role, prices);
    return successResponse(data, "Product pricing updated");
  }

  @Get("reports/products")
  @Roles("ADMINISTRATOR", "TEACHER", "SECRETARY")
  async getProductReports(
    @Query() query: ProductReportQueryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const role = await this.access.resolveRole(userId);
    const teacherId = role === "TEACHER" ? userId : query.teacherId;
    const data = await this.reports.getProductReports({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      teacherId,
    });
    return successResponse(data);
  }

  @Get("date-blocks")
  async listDateBlocks(@Query("teacherId") teacherId?: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.availability.getDateBlocks(teacherId);
    return successResponse(data);
  }

  @Post("date-blocks")
  @Roles("ADMINISTRATOR", "TEACHER")
  async blockDate(
    @CurrentUser() userId: string,
    @Body() dto: BlockDateDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.availability.blockDate(userId, dto);
    return successResponse(data, "Date blocked");
  }

  @Delete("date-blocks/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async unblockDate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<null>> {
    const role = await this.access.resolveRole(userId);
    await this.availability.unblockDate(id, userId, role);
    return successResponse(null, "Date unblocked");
  }

  // ── Analytics & dashboards ─────────────────────────────────────────────

  @Get("analytics/overview")
  @Roles("ADMINISTRATOR", "SECRETARY")
  async getAnalyticsOverview(@Query() query: AnalyticsQueryDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.analytics.getOverview(query);
    return successResponse(data);
  }

  @Get("analytics/teachers")
  @Roles("ADMINISTRATOR", "SECRETARY")
  async getTeacherAnalytics(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const teacherId = query.teacherId ?? (role === "TEACHER" ? userId : undefined);
    if (!teacherId) {
      return successResponse(null, "Teacher required");
    }
    const data = await this.analytics.getTeacherAnalytics(teacherId, query);
    return successResponse(data);
  }

  @Get("analytics/students")
  @Roles("ADMINISTRATOR", "SECRETARY", "TEACHER")
  async getStudentAnalytics(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId);
    const studentId = query.studentId ?? (role === "STUDENT" ? userId : undefined);
    if (!studentId) {
      return successResponse(null, "Student required");
    }
    const data = await this.analytics.getStudentAnalytics(studentId, query);
    return successResponse(data);
  }

  @Get("analytics/sessions")
  @Roles("ADMINISTRATOR", "SECRETARY")
  async getSessionAnalytics(@Query() query: AnalyticsQueryDto): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.analytics.getSessionAnalytics(query);
    return successResponse(data);
  }

  @Get("teacher/kpis")
  @Roles("ADMINISTRATOR", "TEACHER", "SECRETARY")
  async getTeacherKpis(
    @Query("teacherId") teacherId?: string,
    @CurrentUser() userId?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const role = await this.access.resolveRole(userId ?? "");
    const resolvedTeacherId = teacherId ?? (role === "TEACHER" ? userId : undefined);
    if (!resolvedTeacherId) {
      return successResponse(null, "Teacher required");
    }
    const data = await this.dashboard.getTeacherKpis(resolvedTeacherId);
    return successResponse(data);
  }

  @Get("admin/status")
  @Roles("ADMINISTRATOR")
  async getAdminStatus(): Promise<ISuccessResponse<unknown>> {
    const data = await this.dashboard.getAdminStatus();
    return successResponse(data);
  }

  @Get("secretary/dashboard")
  @Roles("SECRETARY", "ADMINISTRATOR")
  async getSecretaryDashboard(): Promise<ISuccessResponse<unknown>> {
    const data = await this.dashboard.getSecretaryOverview();
    return successResponse(data);
  }

  private resolveClientIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? null;
    }
    return req.ip ?? null;
  }
}
