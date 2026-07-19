import { IsOptional, IsString, IsInt, Min, IsArray, IsObject, IsBoolean, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class UpdateVideoQuestionOptionDto {
  @IsOptional()
  @IsString()
  id?: string;

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

export class UpdateVideoQuestionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  title?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVideoQuestionOptionDto)
  options?: UpdateVideoQuestionOptionDto[];
}
