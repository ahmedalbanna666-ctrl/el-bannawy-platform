import { IsArray, ArrayMinSize, ArrayMaxSize, IsBoolean, IsOptional, IsInt, Min, Max } from "class-validator";

export class UpdateGradeScheduleDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days?: number[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
