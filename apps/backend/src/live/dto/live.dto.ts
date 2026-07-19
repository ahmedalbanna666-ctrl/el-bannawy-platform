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
} from "class-validator";
import {
  LiveSessionStatusEnum,
  LiveSessionTypeEnum,
  LiveAttendanceStatusEnum,
  LiveSubscriptionTypeEnum,
  LiveSubscriptionStatusEnum,
  MeetingProviderEnum,
} from "@el-bannawy/shared";

export class CreateLiveSessionDto {
  @IsString()
  title!: string;

  @IsUUID()
  teacherId!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

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
  @IsString()
  notes?: string;
}

export class UpdateLiveSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LiveSessionStatusEnum)
  status?: LiveSessionStatusEnum;
}

export class BookSessionDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}

export class BookBySlotDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
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

  @IsDateString()
  startTime!: string;

  @IsDateString()
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
