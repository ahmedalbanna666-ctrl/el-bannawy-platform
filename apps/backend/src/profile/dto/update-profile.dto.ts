import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  englishName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  parentMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationalSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  academicYearId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  termId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  governorate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  school?: string;
}
