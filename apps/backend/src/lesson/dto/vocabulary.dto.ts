import { IsString, IsOptional, MaxLength, IsUUID, IsArray, ValidateNested, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateVocabularyDto {
  @IsString()
  @MaxLength(255)
  word!: string;

  @IsString()
  @MaxLength(500)
  translation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  example?: string;
}

export class UpdateVocabularyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  word?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  translation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  example?: string;
}

export class CommitVocabularyItemDto {
  @IsString()
  @MaxLength(255)
  word!: string;

  @IsString()
  @MaxLength(500)
  translation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  example?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsUUID()
  replaceVocabId?: string;
}

export class CommitVocabularyImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitVocabularyItemDto)
  items!: CommitVocabularyItemDto[];

  @IsOptional()
  @IsUUID("all", { each: true })
  removeVocabIds?: string[];
}
