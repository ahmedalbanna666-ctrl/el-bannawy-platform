import { IsString, IsArray, IsOptional } from "class-validator";

export class AnswerVideoQuestionDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedOptionIds!: string[];

  @IsOptional()
  @IsString()
  text?: string;
}
