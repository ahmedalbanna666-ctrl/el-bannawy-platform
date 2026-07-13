import { IsString, IsOptional, IsBoolean } from "class-validator";
import { Type } from "class-transformer";

export class UpdateAcademicYearDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
