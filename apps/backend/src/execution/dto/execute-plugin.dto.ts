import { IsString, IsNumber, IsOptional, IsObject } from "class-validator";

export class ExecutePluginDto {
  @IsString()
  videoId!: string;

  @IsString()
  eventId!: string;

  @IsString()
  pluginType!: string;

  @IsString()
  userId!: string;

  @IsNumber()
  currentTime!: number;

  @IsString()
  playbackState!: string;

  @IsOptional()
  @IsObject()
  eventPayload?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
