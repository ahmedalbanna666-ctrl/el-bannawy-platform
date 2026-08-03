import { IsString, IsOptional, IsBoolean, IsIn, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(["AUTO", "MANUAL"])
  termManagementMode?: string;

  @IsOptional()
  @IsString()
  activeAcademicYearId?: string;

  @IsOptional()
  @IsString()
  activeTermId?: string;

  @IsOptional()
  @IsString()
  autoTermStartDate?: string;

  @IsOptional()
  @IsString()
  autoTermEndDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  maintenanceMode?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  certificateThreshold?: number;
}
