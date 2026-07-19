import { IsString, IsInt, IsOptional, IsBoolean, IsObject, Min } from "class-validator";

export class CreateVideoEventDto {
  @IsString()
  videoId!: string;

  @IsInt()
  @Min(0)
  timestamp!: number;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

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
