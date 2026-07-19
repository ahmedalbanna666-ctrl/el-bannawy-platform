import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsUUID } from "class-validator";
import { Type } from "class-transformer";

export enum MistakeSource {
  ASSESSMENT = "ASSESSMENT",
  QUIZ = "QUIZ",
  HOMEWORK = "HOMEWORK",
  STORY = "STORY",
}

export class MistakeQueryDto {
  @IsOptional()
  @IsString()
  scope?: "all" | "today" | "term";

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
