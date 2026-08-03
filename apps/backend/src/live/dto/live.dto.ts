import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";
import {
  LiveSessionStatusEnum,
  LiveSessionTypeEnum,
  LiveSessionKindEnum,
  LiveAttendanceStatusEnum,
  LiveSubscriptionTypeEnum,
  LiveSubscriptionStatusEnum,
  LiveBookingRescheduleStatusEnum,
  MeetingProviderEnum,
} from "@el-bannawy/shared";

const AVAILABILITY_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Accepts an availability time-of-day in "HH:mm" (24-hour) form, or a full
 * ISO date string for backward compatibility. The service normalizes both
 * into the canonical UTC "HH:mm" time-of-day contract.
 */
@ValidatorConstraint({ name: "availabilityTime", async: false })
export class AvailabilityTimeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (AVAILABILITY_TIME_RE.test(value)) return true;
    return !Number.isNaN(new Date(value).getTime());
  }

  defaultMessage(): string {
    return "time must be in HH:mm format (or a valid ISO date string)";
  }
}

export function IsAvailabilityTime(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      target: object.constructor,
      name: "availabilityTime",
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: AvailabilityTimeConstraint,
    });
  };
}

export class CreateLiveSessionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  teacherId!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  availabilitySlotId?: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents?: number;

  @IsEnum(LiveSessionTypeEnum)
  type!: LiveSessionTypeEnum;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @IsOptional()
  @IsEnum(MeetingProviderEnum)
  meetingProvider?: MeetingProviderEnum;

  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLiveSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents?: number;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @IsOptional()
  @IsEnum(MeetingProviderEnum)
  meetingProvider?: MeetingProviderEnum;

  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LiveSessionStatusEnum)
  status?: LiveSessionStatusEnum;
}

export class CreateZoomMeetingDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean;

  @IsOptional()
  @IsBoolean()
  muteUponEntry?: boolean;

  @IsOptional()
  @IsBoolean()
  joinBeforeHost?: boolean;

  @IsOptional()
  @IsBoolean()
  hostVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  participantVideo?: boolean;
}

export class UpdateZoomMeetingDto extends CreateZoomMeetingDto {}

export class JoinSessionDto {
  @IsOptional()
  @IsString()
  @Max(255)
  device?: string;
}

export class LeaveSessionDto {
  @IsOptional()
  @IsString()
  @Max(255)
  device?: string;
}

export class BookSessionDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsEnum(LiveSessionKindEnum)
  bookingKind?: LiveSessionKindEnum;
}

export class BookBySlotDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsEnum(LiveSessionKindEnum)
  bookingKind?: LiveSessionKindEnum;
}

export class RecurringBookDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}

export class ProductReportQueryDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class AnalyticsQueryDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;
}

export class RecordAttendanceDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  studentId!: string;

  @IsEnum(LiveAttendanceStatusEnum)
  status!: LiveAttendanceStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTeacherAvailabilityDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsAvailabilityTime()
  startTime!: string;

  @IsAvailabilityTime()
  endTime!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents?: number;

  @IsOptional()
  @IsEnum(LiveSessionTypeEnum)
  type?: LiveSessionTypeEnum;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateTeacherAvailabilityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents?: number;

  @IsOptional()
  @IsEnum(LiveSessionTypeEnum)
  type?: LiveSessionTypeEnum;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class CreateSubscriptionDto {
  @IsUUID()
  teacherId!: string;

  @IsEnum(LiveSubscriptionTypeEnum)
  type!: LiveSubscriptionTypeEnum;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(LiveSubscriptionTypeEnum)
  type?: LiveSubscriptionTypeEnum;

  @IsOptional()
  @IsEnum(LiveSubscriptionStatusEnum)
  status?: LiveSubscriptionStatusEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateAnnouncementDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  pin?: boolean;
}

export class BlockDateDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AvailableSlotQueryDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;
}

export class OverrideSettingsDto {
  [key: string]: unknown;
}

export class RequestRescheduleDto {
  @IsString()
  reason!: string;
}

export class RescheduleDecisionDto {
  @IsEnum(LiveBookingRescheduleStatusEnum)
  decision!: LiveBookingRescheduleStatusEnum;
}
