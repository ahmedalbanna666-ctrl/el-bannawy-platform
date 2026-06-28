import { IsString, IsOptional, IsBoolean } from "class-validator";

export class SendNotificationDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsString()
  targetType!: string;

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
  @IsString()
  channel?: string;

  @IsString()
  targetType!: string;

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
