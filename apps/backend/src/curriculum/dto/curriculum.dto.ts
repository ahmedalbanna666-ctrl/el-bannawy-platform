import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
} from "class-validator";

export class CreateUnitDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  gradeId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  lockedOverride?: boolean;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  termId!: string;

  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsString()
  educationalSystem?: string;
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  lockedOverride?: boolean;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  termId?: string;

  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsString()
  educationalSystem?: string;
}

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  lockedOverride?: boolean;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  lockedOverride?: boolean;

  @IsOptional()
  @IsBoolean()
  homeworkEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quizEnabled?: boolean;
}
