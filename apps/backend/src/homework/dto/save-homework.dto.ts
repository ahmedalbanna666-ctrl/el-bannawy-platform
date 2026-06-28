import {
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SaveAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  @IsOptional()
  selectedAnswer?: string;
}

export class SaveHomeworkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerDto)
  answers!: SaveAnswerDto[];
}
