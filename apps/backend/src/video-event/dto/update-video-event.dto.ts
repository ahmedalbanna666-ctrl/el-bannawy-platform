import { IsOptional, IsString, IsInt, IsBoolean, IsObject, Min } from "class-validator";

export class UpdateVideoEventDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  timestamp?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
