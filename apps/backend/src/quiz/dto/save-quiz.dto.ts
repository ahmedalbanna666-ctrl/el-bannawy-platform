import {
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SaveQuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  @IsOptional()
  selectedAnswer?: string;
}

export class SaveQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveQuizAnswerDto)
  answers!: SaveQuizAnswerDto[];
}
