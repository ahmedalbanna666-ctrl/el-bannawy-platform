import { IsString, IsInt, IsOptional, Min, Max } from "class-validator";

export class ReviewEssayAnswerDto {
  @IsString()
  answerId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  teacherScore!: number;

  @IsOptional()
  @IsString()
  teacherFeedback?: string;
}

export class ReviewQuizDto {
  @IsString()
  attemptId!: string;

  @IsString()
  @IsOptional()
  reviews?: ReviewEssayAnswerDto[];
}
