import { IsString, IsOptional, IsInt, Min, IsArray, IsObject, IsBoolean, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class CreateWithEventOptionDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateVideoQuestionWithEventDto {
  @IsString()
  videoId!: string;

  @IsInt()
  @Min(0)
  timestamp!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWithEventOptionDto)
  options!: CreateWithEventOptionDto[];
}
