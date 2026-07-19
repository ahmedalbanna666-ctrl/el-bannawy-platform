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

export enum MeetingProviderEnum {
  EXTERNAL_URL = "EXTERNAL_URL",
  ZOOM_SDK = "ZOOM_SDK",
}

export interface ILiveSession {
  readonly id: string;
  readonly title: string;
  readonly teacherId: string;
  readonly gradeId: string | null;
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
  readonly cancelledAt: string | null;
  readonly cancelReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly teacherId: string;
  readonly gradeId?: string;
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
  readonly notes?: string;
}

export interface IUpdateLiveSessionDto {
  readonly title?: string;
  readonly date?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly durationMinutes?: number;
  readonly maxStudents?: number;
  readonly meetingUrl?: string;
  readonly meetingPassword?: string;
  readonly meetingProvider?: MeetingProviderEnum;
  readonly notes?: string;
  readonly status?: LiveSessionStatusEnum;
}

export interface IBookSessionDto {
  readonly sessionId: string;
  readonly subscriptionId?: string;
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
