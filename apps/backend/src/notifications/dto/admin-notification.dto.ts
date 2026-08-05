import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";
import { NotificationChannel } from "./notification.dto";

export class UpdateNotificationConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateWhatsAppConfigDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountSid?: string;

  @IsOptional()
  @IsString()
  authToken?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class SendTestWhatsAppDto {
  @IsString()
  to!: string;

  @IsString()
  message!: string;
}

export class SendTestPushDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
