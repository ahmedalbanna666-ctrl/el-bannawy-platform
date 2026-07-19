import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  answer?: string | null;
}

export class SubmitMiniExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];

  @IsOptional()
  @IsBoolean()
  timeExpired?: boolean;
}
