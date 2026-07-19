import { IsInt, IsOptional, IsString, Min, Max, IsUUID, IsEnum } from "class-validator";
import { MistakeSource } from "./mistake-query.dto";

export class CreateMiniExamDto {
  @IsInt()
  @Min(1)
  @Max(50)
  questionCount!: number;

  @IsInt()
  @Min(1)
  @Max(120)
  durationMinutes!: number;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  storyId?: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsOptional()
  @IsEnum(MistakeSource)
  source?: MistakeSource;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;
}
