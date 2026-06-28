import { IsArray, IsString, IsOptional, ArrayMinSize } from "class-validator";

export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  answers!: string[];

  @IsOptional()
  @IsString()
  response?: string;
}
