export enum LiveSessionStatusEnum {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  SCHEDULED = "SCHEDULED",
  OPEN = "OPEN",
  FULL = "FULL",
  LIVE = "LIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  ARCHIVED = "ARCHIVED",
}

export enum LiveSessionTypeEnum {
  PRIVATE = "PRIVATE",
  GROUP = "GROUP",
}

/**
 * Unified booking session kind resolved deterministically by SessionKindResolver.
 * Precedence: GROUP session type > PRIVATE + PRIVATE_MONTHLY > PRIVATE + ONE_TIME_PRIVATE > FREE.
 */
export enum LiveSessionKindEnum {
  PRIVATE_MONTHLY = "PRIVATE_MONTHLY",
  GROUP = "GROUP",
  ONE_TIME = "ONE_TIME",
  FREE = "FREE",
}

export enum LiveBookingStatusEnum {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  RESCHEDULED = "RESCHEDULED",
}

export enum LiveAttendanceStatusEnum {
  JOINED = "JOINED",
  LATE = "LATE",
  LEFT_EARLY = "LEFT_EARLY",
  ABSENT = "ABSENT",
  COMPLETED = "COMPLETED",
}

export enum LiveSubscriptionTypeEnum {
  PRIVATE_MONTHLY = "PRIVATE_MONTHLY",
  GROUP_MONTHLY = "GROUP_MONTHLY",
  ONE_TIME_PRIVATE = "ONE_TIME_PRIVATE",
}

export enum LiveSubscriptionStatusEnum {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  SUSPENDED = "SUSPENDED",
}

export enum LiveWaitingListStatusEnum {
  WAITING = "WAITING",
  PROMOTED = "PROMOTED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum LiveBookingRescheduleStatusEnum {
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum LiveRefundStatusEnum {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PROCESSED = "PROCESSED",
  REJECTED = "REJECTED",
}

export enum MeetingProviderEnum {
  EXTERNAL_URL = "EXTERNAL_URL",
  ZOOM_SDK = "ZOOM_SDK",
}

export interface ILiveSession {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly teacherId: string;
  readonly gradeId: string | null;
  readonly lessonId: string | null;
  readonly courseId: string | null;
  readonly groupId: string | null;
  readonly availabilitySlotId: string | null;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
  readonly maxStudents: number | null;
  readonly availableSeats: number | null;
  readonly status: LiveSessionStatusEnum;
  readonly type: LiveSessionTypeEnum;
  readonly meetingUrl: string | null;
  readonly meetingPassword: string | null;
  readonly meetingProvider: MeetingProviderEnum;
  readonly zoomMeetingId: string | null;
  readonly zoomPassword: string | null;
  readonly zoomJoinUrl: string | null;
  readonly waitingRoom: boolean;
  readonly autoRecord: boolean;
  readonly notes: string | null;
  readonly publishedAt: string | null;
  readonly scheduledAt: string | null;
  readonly openedAt: string | null;
  readonly liveAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly cancelReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ILiveBooking {
  readonly id: string;
  readonly sessionId: string;
  readonly studentId: string;
  readonly subscriptionId: string | null;
  readonly status: LiveBookingStatusEnum;
  readonly rescheduleRequestedAt: string | null;
  readonly rescheduleReason: string | null;
  readonly rescheduleStatus: LiveBookingRescheduleStatusEnum | null;
  readonly rescheduleResolvedAt: string | null;
  readonly rescheduleResolvedById: string | null;
  readonly cancelledAt: string | null;
  readonly cancelReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ILiveWaitingListEntry {
  readonly id: string;
  readonly sessionId: string;
  readonly studentId: string;
  readonly status: LiveWaitingListStatusEnum;
  readonly position: number;
  readonly joinedAt: string;
  readonly promotedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ILiveRefund {
  readonly id: string;
  readonly paymentId: string;
  readonly userId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reason: string | null;
  readonly status: LiveRefundStatusEnum;
  readonly processedById: string | null;
  readonly processedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IRescheduleBookingDto {
  readonly reason: string;
  readonly targetSessionId?: string;
}

export interface IJoinWaitingListDto {
  readonly sessionId: string;
}

export interface ILiveSubscription {
  readonly id: string;
  readonly userId: string;
  readonly type: LiveSubscriptionTypeEnum;
  readonly packageLabel: string;
  readonly packageSessionCount: number;
  readonly status: LiveSubscriptionStatusEnum;
  readonly teacherId: string | null;
  readonly groupId: string | null;
  readonly sessionsTotal: number;
  readonly sessionsUsed: number;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly nextBillingDate: string | null;
  readonly autoRenew: boolean;
  readonly price: number;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ILiveAttendance {
  readonly id: string;
  readonly sessionId: string;
  readonly studentId: string;
  readonly status: LiveAttendanceStatusEnum;
  readonly joinedAt: string | null;
  readonly leftAt: string | null;
  readonly durationMinutes: number | null;
  readonly markedBy: string;
  readonly markedById: string | null;
  readonly device: string | null;
  readonly ip: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ITeacherAvailability {
  readonly id: string;
  readonly teacherId: string;
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly gradeId: string | null;
  readonly maxStudents: number;
  readonly type: LiveSessionTypeEnum;
  readonly isRecurring: boolean;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface IAvailableSlot {
  readonly slotId: string;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly dayOfWeek: number;
  readonly type: LiveSessionTypeEnum;
  readonly maxStudents: number;
  readonly gradeId: string | null;
  readonly existingSessionId: string | null;
  readonly availableSeats: number;
}

export interface ITeacherDateBlock {
  readonly id: string;
  readonly teacherId: string;
  readonly blockedDate: string;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly deletedAt: string | null;
}

export interface ITeacherLiveSettings {
  readonly id: string;
  readonly teacherId: string;
  readonly defaultMeetingUrl: string | null;
  readonly meetingPassword: string | null;
  readonly meetingProvider: MeetingProviderEnum;
  readonly allowOverride: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ICreateLiveSessionDto {
  readonly title: string;
  readonly description?: string;
  readonly teacherId: string;
  readonly gradeId?: string;
  readonly lessonId?: string;
  readonly courseId?: string;
  readonly availabilitySlotId?: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes?: number;
  readonly maxStudents?: number;
  readonly type: LiveSessionTypeEnum;
  readonly meetingUrl?: string;
  readonly meetingPassword?: string;
  readonly meetingProvider?: MeetingProviderEnum;
  readonly zoomMeetingId?: string;
  readonly zoomPassword?: string;
  readonly zoomJoinUrl?: string;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly notes?: string;
}

export interface IUpdateLiveSessionDto {
  readonly title?: string;
  readonly description?: string;
  readonly gradeId?: string;
  readonly lessonId?: string;
  readonly courseId?: string;
  readonly date?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly durationMinutes?: number;
  readonly maxStudents?: number;
  readonly meetingUrl?: string;
  readonly meetingPassword?: string;
  readonly meetingProvider?: MeetingProviderEnum;
  readonly zoomMeetingId?: string;
  readonly zoomPassword?: string;
  readonly zoomJoinUrl?: string;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly notes?: string;
  readonly status?: LiveSessionStatusEnum;
}

export interface ICreateZoomMeetingDto {
  readonly topic?: string;
  readonly durationMinutes?: number;
  readonly startTime?: string;
  readonly timezone?: string;
  readonly password?: string;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly muteUponEntry?: boolean;
  readonly joinBeforeHost?: boolean;
  readonly hostVideo?: boolean;
  readonly participantVideo?: boolean;
}

export interface IUpdateZoomMeetingDto {
  readonly topic?: string;
  readonly durationMinutes?: number;
  readonly startTime?: string;
  readonly timezone?: string;
  readonly password?: string;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly muteUponEntry?: boolean;
  readonly joinBeforeHost?: boolean;
  readonly hostVideo?: boolean;
  readonly participantVideo?: boolean;
}

export interface IZoomMeetingJoinConfig {
  readonly sessionId: string;
  readonly sessionTitle: string;
  readonly meetingNumber: string;
  readonly password: string | null;
  readonly sdkKey: string;
  readonly signature: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly role: 0 | 1;
  readonly provider: MeetingProviderEnum;
  readonly zoomJoinUrl: string | null;
  readonly leaveUrl: string | null;
  readonly startedAt: string;
}

export interface IJoinSessionDto {
  readonly device?: string;
}

export interface ILeaveSessionDto {
  readonly device?: string;
}

export interface ILessonLiveSessionView {
  readonly session: ILiveSession;
  readonly isBooked: boolean;
  readonly hasActiveSubscription: boolean;
  readonly canJoin: boolean;
  readonly myAttendance: ILiveAttendance | null;
}

export interface IBookSessionDto {
  readonly sessionId: string;
  readonly subscriptionId?: string;
  /** Optional hint; the engine resolves the authoritative kind deterministically. */
  readonly bookingKind?: LiveSessionKindEnum;
}

export interface IRecordAttendanceDto {
  readonly sessionId: string;
  readonly studentId: string;
  readonly status: LiveAttendanceStatusEnum;
  readonly notes?: string;
}

export interface IBookBySlotDto {
  readonly date: string;
  readonly subscriptionId?: string;
  /** Optional hint; the engine resolves the authoritative kind deterministically. */
  readonly bookingKind?: LiveSessionKindEnum;
}

export interface IAvailableSlotQuery {
  readonly teacherId?: string;
  readonly gradeId?: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

export interface ICreateTeacherAvailabilityDto {
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly gradeId?: string;
  readonly maxStudents?: number;
  readonly type?: LiveSessionTypeEnum;
  readonly isRecurring?: boolean;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
}
