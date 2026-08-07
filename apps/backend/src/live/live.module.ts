import { Module } from "@nestjs/common";
import { LiveController } from "./live.controller";
import { LiveAccessService } from "./live-access.service";
import { LiveSessionService } from "./live-session.service";
import { LiveBookingService } from "./live-booking.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { LiveControlPanelService } from "./live-control-panel.service";
import { LiveAttendanceService } from "./live-attendance.service";
import { LiveWaitingListService } from "./live-waitlist.service";
import {
  BookingEngineService,
  SessionKindResolver,
  BookingValidationService,
  ReservationService,
  RefundPolicyService,
} from "./booking";
import { LIVE_POLICY_ENGINE, BootstrapLivePolicy } from "./policy";
import { LIVE_DOMAIN_EVENT_BUS, InProcessDomainEventBus } from "./events";
import { LiveZoomMeetingService } from "./live-zoom-meeting.service";
import { LiveRecurringBookingService } from "./live-recurring-booking.service";
import { LiveReportsService } from "./live-reports.service";
import { LiveAnalyticsService } from "./live-analytics.service";
import { LiveDashboardService } from "./live-dashboard.service";
import { LiveNotificationService } from "./live-notification.service";
import { LiveSubscriptionSchedulerService } from "./live-subscription-scheduler.service";
import { LiveProductPricingService } from "./live-product-pricing.service";
import { StudyScheduleService } from "./study-schedule.service";
import { LiveActivationService } from "./live-activation.service";
import { SubscriptionPeriodEndProcessor } from "./subscription-period-end.processor";
import { ZoomProvider } from "./meeting-provider/zoom.provider";
import { MEETING_PROVIDER } from "./meeting-provider/meeting-provider.interface";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZoomModule } from "../zoom/zoom.module";

@Module({
  imports: [ZoomModule],
  controllers: [LiveController],
  providers: [
    LiveAccessService,
    LiveSessionService,
    LiveBookingService,
    LiveSubscriptionService,
    LiveAvailabilityService,
    LiveControlPanelService,
    LiveAttendanceService,
    LiveWaitingListService,
    LiveZoomMeetingService,
    LiveRecurringBookingService,
    LiveReportsService,
    LiveAnalyticsService,
    LiveDashboardService,
    LiveNotificationService,
    LiveSubscriptionSchedulerService,
    LiveProductPricingService,
    StudyScheduleService,
    LiveActivationService,
    SubscriptionPeriodEndProcessor,
    SessionKindResolver,
    BookingValidationService,
    ReservationService,
    RefundPolicyService,
    BookingEngineService,
    { provide: LIVE_POLICY_ENGINE, useClass: BootstrapLivePolicy },
    { provide: LIVE_DOMAIN_EVENT_BUS, useClass: InProcessDomainEventBus },
    { provide: MEETING_PROVIDER, useClass: ZoomProvider },
    RolesGuard,
  ],
  exports: [
    LiveSessionService,
    LiveBookingService,
    LiveSubscriptionService,
    LiveAvailabilityService,
    LiveProductPricingService,
    LiveRecurringBookingService,
    StudyScheduleService,
    LiveActivationService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS module container
export class LiveModule {}
