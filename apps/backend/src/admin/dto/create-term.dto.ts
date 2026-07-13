import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;
}
