import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsArray, ArrayMinSize, Min } from "class-validator";

export class CreateFinalReviewDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsUUID() gradeId!: string;
  @IsUUID() academicYearId!: string;
  @IsUUID() termId!: string;
  @IsString() educationalSystem!: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdateFinalReviewDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsUUID() gradeId?: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() termId?: string;
  @IsOptional() @IsString() educationalSystem?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class PublishDto { @IsBoolean() published!: boolean; }

export class CreateSectionDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) questionCount?: number;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) questionCount?: number;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class ReorderSectionsDto {
  @IsArray() @ArrayMinSize(1) @IsUUID("4", { each: true }) sectionIds!: string[];
}
