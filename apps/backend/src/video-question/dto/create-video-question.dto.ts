import { IsString, IsOptional, IsInt, Min, IsArray, IsObject, IsBoolean, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class CreateVideoQuestionOptionDto {
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

export class CreateVideoQuestionDto {
  @IsString()
  videoEventId!: string;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVideoQuestionOptionDto)
  options!: CreateVideoQuestionOptionDto[];
}
