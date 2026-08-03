import { IsUUID, IsArray, ArrayMinSize, IsBoolean, IsOptional, ArrayMaxSize, IsInt, Min, Max } from "class-validator";

export class CreateGradeScheduleDto {
  @IsUUID()
  gradeId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days!: number[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
