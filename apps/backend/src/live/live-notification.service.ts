import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  NotificationPriority,
  NotificationTargetType,
} from "../notifications/dto/notification.dto";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_BOOKING_EVENTS,
  LIVE_SESSION_EVENTS,
  LIVE_SUBSCRIPTION_EVENTS,
  LIVE_WAITLIST_EVENTS,
  type BookingCreatedEvent,
  type BookingCancelledEvent,
  type RescheduleRequestedEvent,
  type RescheduleResolvedEvent,
  type SessionStartedEvent,
  type SessionEndedEvent,
  type SessionCancelledEvent,
  type WaitlistJoinedEvent,
  type WaitlistPromotedEvent,
  type SubscriptionCreatedEvent,
  type LiveDomainEventBus,
  type LiveDomainEventSubscription,
} from "./events";

/**
 * LiveNotificationService — notification side effects for live domain events.
 *
 * Subscribes to the LiveDomainEventBus and translates every lifecycle event
 * into an in-app notification through NotificationsService. Notifications are
 * a pure side effect: a failing handler is contained by the bus and never
 * breaks the domain write that produced the event.
 */
@Injectable()
export class LiveNotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveNotificationService.name);
  private readonly subscriptions: LiveDomainEventSubscription[] = [];

  constructor(
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.subscriptions.push(
      this.events.subscribe(LIVE_BOOKING_EVENTS.CREATED, (event) =>
        this.onBookingCreated(event as BookingCreatedEvent),
      ),
      this.events.subscribe(LIVE_BOOKING_EVENTS.CANCELLED, (event) =>
        this.onBookingCancelled(event as BookingCancelledEvent),
      ),
      this.events.subscribe(LIVE_BOOKING_EVENTS.RESCHEDULE_REQUESTED, (event) =>
        this.onRescheduleRequested(event as RescheduleRequestedEvent),
      ),
      this.events.subscribe(LIVE_BOOKING_EVENTS.RESCHEDULE_RESOLVED, (event) =>
        this.onRescheduleResolved(event as RescheduleResolvedEvent),
      ),
      this.events.subscribe(LIVE_SESSION_EVENTS.STARTED, (event) =>
        this.onSessionStarted(event as SessionStartedEvent),
      ),
      this.events.subscribe(LIVE_SESSION_EVENTS.ENDED, (event) =>
        this.onSessionEnded(event as SessionEndedEvent),
      ),
      this.events.subscribe(LIVE_SESSION_EVENTS.CANCELLED, (event) =>
        this.onSessionCancelled(event as SessionCancelledEvent),
      ),
      this.events.subscribe(LIVE_WAITLIST_EVENTS.JOINED, (event) =>
        this.onWaitlistJoined(event as WaitlistJoinedEvent),
      ),
      this.events.subscribe(LIVE_WAITLIST_EVENTS.PROMOTED, (event) =>
        this.onWaitlistPromoted(event as WaitlistPromotedEvent),
      ),
      this.events.subscribe(LIVE_SUBSCRIPTION_EVENTS.CREATED, (event) =>
        this.onSubscriptionCreated(event as SubscriptionCreatedEvent),
      ),
    );
  }

  onModuleDestroy(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
  }

  // ── Booking ────────────────────────────────────────────────────────────

  private async onBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const { sessionTitle, teacherId, studentId, sessionStartTime, bookingKind } =
      event.payload;
    const studentName = await this.resolveUserName(studentId);
    const start = this.formatDateTime(sessionStartTime);

    await this.notifications.sendNotification(teacherId, {
      type: "live_booking_confirmation",
      title: "حجز حصة مباشرة",
      message: `تم حجز حصة مباشرة "${sessionTitle}" (${bookingKind}) في ${start} بواسطة ${studentName ?? "طالب"}`,
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: teacherId,
    });

    await this.notifications.sendNotification(studentId, {
      type: "live_booking_confirmation",
      title: "تم تأكيد حجزك",
      message: `تم تأكيد حجزك في الحصة المباشرة "${sessionTitle}" يوم ${start}`,
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: studentId,
    });
  }

  private async onBookingCancelled(event: BookingCancelledEvent): Promise<void> {
    const { sessionTitle, teacherId, studentId } = event.payload;
    const studentName = await this.resolveUserName(studentId);

    await this.notifications.sendNotification(studentId, {
      type: "live_booking_cancellation",
      title: "تم إلغاء الحجز",
      message: `تم إلغاء حجزك في الحصة المباشرة "${sessionTitle}"`,
      priority: NotificationPriority.LOW,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: studentId,
    });

    await this.notifications.sendNotification(teacherId, {
      type: "live_booking_cancellation",
      title: "إلغاء حجز",
      message: `تم إلغاء حجز ${studentName ?? "طالب"} في الحصة المباشرة "${sessionTitle}"`,
      priority: NotificationPriority.LOW,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: teacherId,
    });
  }

  // ── Reschedule ─────────────────────────────────────────────────────────

  private async onRescheduleRequested(event: RescheduleRequestedEvent): Promise<void> {
    const { sessionTitle, teacherId, studentId, reason } = event.payload;
    const studentName = await this.resolveUserName(studentId);

    await this.notifications.sendNotification(teacherId, {
      type: "live_reschedule_requested",
      title: "طلب تغيير موعد",
      message: `طلب ${studentName ?? "طالب"} تغيير موعد حصته "${sessionTitle}": ${reason}`,
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: teacherId,
    });
  }

  private async onRescheduleResolved(event: RescheduleResolvedEvent): Promise<void> {
    const { sessionTitle, teacherId, studentId, decision } = event.payload;
    const resolved =
      decision === "APPROVED"
        ? "تمت الموافقة على تغيير موعد الحصة"
        : "تم رفض طلب تغيير موعد الحصة";

    await this.notifications.sendNotification(studentId, {
      type: "live_reschedule_resolved",
      title: decision === "APPROVED" ? "تم تغيير الموعد" : "رفض تغيير الموعد",
      message: `${resolved} "${sessionTitle}"`,
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: studentId,
    });

    void teacherId;
  }

  // ── Session lifecycle ──────────────────────────────────────────────────

  private async onSessionStarted(event: SessionStartedEvent): Promise<void> {
    const { sessionId, sessionTitle, teacherId } = event.payload;
    const bookedStudents = await this.prisma.liveBooking.findMany({
      where: { sessionId, cancelledAt: null },
      select: { studentId: true },
    });
    for (const { studentId } of bookedStudents) {
      await this.notifications.sendNotification(teacherId, {
        type: "live_session_started",
        title: "الحصة بدأت الآن",
        message: `بدأت الحصة المباشرة "${sessionTitle}" الآن، اضغط للانضمام`,
        priority: NotificationPriority.HIGH,
        targetType: NotificationTargetType.INDIVIDUAL,
        targetId: studentId,
      });
    }
  }

  private async onSessionEnded(event: SessionEndedEvent): Promise<void> {
    const { sessionId, sessionTitle, teacherId } = event.payload;
    const bookedStudents = await this.prisma.liveBooking.findMany({
      where: { sessionId, cancelledAt: null },
      select: { studentId: true },
    });
    for (const { studentId } of bookedStudents) {
      await this.notifications.sendNotification(teacherId, {
        type: "live_session_ended",
        title: "انتهت الحصة",
        message: `انتهت الحصة المباشرة "${sessionTitle}". سنسعد برؤيتك في الحصة القادمة`,
        priority: NotificationPriority.LOW,
        targetType: NotificationTargetType.INDIVIDUAL,
        targetId: studentId,
      });
    }
  }

  private async onSessionCancelled(event: SessionCancelledEvent): Promise<void> {
    const { sessionId, sessionTitle, teacherId } = event.payload;
    const bookedStudents = await this.prisma.liveBooking.findMany({
      where: { sessionId, cancelledAt: null },
      select: { studentId: true },
    });
    for (const { studentId } of bookedStudents) {
      await this.notifications.sendNotification(teacherId, {
        type: "live_session_cancelled",
        title: "إلغاء حصة مباشرة",
        message: `تم إلغاء الحصة المباشرة "${sessionTitle}". سيتم رد رصيدك إن كان مستحقاً`,
        priority: NotificationPriority.MEDIUM,
        targetType: NotificationTargetType.INDIVIDUAL,
        targetId: studentId,
      });
    }
  }

  // ── Waitlist ───────────────────────────────────────────────────────────

  private async onWaitlistJoined(event: WaitlistJoinedEvent): Promise<void> {
    const { sessionTitle, studentId, position } = event.payload;

    await this.notifications.sendNotification(studentId, {
      type: "live_waitlist_update",
      title: "انضممت لقائمة الانتظار",
      message: `أصبحت في قائمة الانتظار لحصة "${sessionTitle}" بالترتيب رقم ${String(position)}. سنخبرك فور توفر مقعد`,
      priority: NotificationPriority.LOW,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: studentId,
    });
  }

  private async onWaitlistPromoted(event: WaitlistPromotedEvent): Promise<void> {
    const { sessionTitle, studentId, teacherId } = event.payload;

    await this.notifications.sendNotification(studentId, {
      type: "live_waitlist_update",
      title: "تم تأكيد حجزك!",
      message: `تم ترقية طلبك من قائمة الانتظار إلى حجز مؤكد في الحصة "${sessionTitle}"`,
      priority: NotificationPriority.HIGH,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: studentId,
    });

    await this.notifications.sendNotification(teacherId, {
      type: "live_waitlist_update",
      title: "حجز من قائمة الانتظار",
      message: `تمت ترقية طالب من قائمة الانتظار إلى حجز مؤكد في الحصة "${sessionTitle}"`,
      priority: NotificationPriority.LOW,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: teacherId,
    });
  }

  // ── Subscription ───────────────────────────────────────────────────────

  private async onSubscriptionCreated(event: SubscriptionCreatedEvent): Promise<void> {
    const { userId, teacherId, type, sessionsTotal, periodEnd } = event.payload;
    const teacher = await this.resolveUserName(teacherId);
    const ends = this.formatDate(periodEnd);

    await this.notifications.sendNotification(userId, {
      type: "live_subscription_created",
      title: "تم تفعيل اشتراكك",
      message: `تم تفعيل اشتراكك ${type} مع ${teacher ?? "المعلم"} (${String(sessionsTotal)} حصص) حتى ${ends}`,
      priority: NotificationPriority.MEDIUM,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: userId,
    });

    await this.notifications.sendNotification(teacherId, {
      type: "live_subscription_created",
      title: "اشتراك جديد",
      message: `قام طالب جديد بالاشتراك معك بنوع ${type}`,
      priority: NotificationPriority.LOW,
      targetType: NotificationTargetType.INDIVIDUAL,
      targetId: teacherId,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async resolveUserName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    return user?.fullName ?? null;
  }

  private formatDateTime(value: Date): string {
    return value.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  private formatDate(value: Date): string {
    return value.toLocaleDateString("ar-EG", { dateStyle: "medium" });
  }
}
