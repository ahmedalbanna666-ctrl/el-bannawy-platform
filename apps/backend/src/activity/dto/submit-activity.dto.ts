import { IsString, IsOptional, IsInt, Min, IsArray } from "class-validator";

export class SubmitActivityDto {
  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answers?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}
