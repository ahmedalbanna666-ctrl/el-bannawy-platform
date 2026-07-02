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
  educationalStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  academicTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  governorate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  school?: string;
}
