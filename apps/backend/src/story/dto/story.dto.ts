import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsArray, ArrayMinSize, Min } from "class-validator";

export class CreateStoryDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsUUID()
  gradeId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  termId!: string;

  @IsString()
  educationalSystem!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  termId?: string;

  @IsOptional()
  @IsString()
  educationalSystem?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PublishStoryDto {
  @IsBoolean()
  published!: boolean;
}

export class CreateChapterDto {
  @IsString()
  title!: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PublishChapterDto {
  @IsBoolean()
  published!: boolean;
}

export class ReorderChaptersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  chapterIds!: string[];
}
