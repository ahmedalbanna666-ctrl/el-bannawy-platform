import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";

export enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  PUSH = "PUSH",
}

export enum NotificationTargetType {
  ALL_STUDENTS = "all_students",
  INDIVIDUAL = "individual",
  GRADE = "grade",
}

export class SendNotificationDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsEnum(NotificationTargetType)
  targetType!: NotificationTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;
}

export class ScheduleNotificationDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsEnum(NotificationTargetType)
  targetType!: NotificationTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsString()
  scheduledAt!: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  lessonReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  homeworkReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  liveSessionReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  achievementNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  motivationalMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  studyTips?: boolean;

  @IsOptional()
  @IsBoolean()
  teacherAnnouncements?: boolean;
}
