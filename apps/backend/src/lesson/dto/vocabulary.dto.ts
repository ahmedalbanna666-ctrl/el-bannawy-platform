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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  partOfSpeech?: string;
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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  partOfSpeech?: string;
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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  partOfSpeech?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  synonym?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  synonymTranslation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  antonym?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  antonymTranslation?: string;

  @IsOptional()
  @IsString()
  sectionClientDraftId?: string;
}

export class CommitVocabularySectionDto {
  @IsOptional()
  @IsString()
  clientDraftId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  kind?: string;
}

export class CommitVocabularyImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitVocabularyItemDto)
  items!: CommitVocabularyItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitVocabularySectionDto)
  sections?: CommitVocabularySectionDto[];

  @IsOptional()
  @IsUUID("all", { each: true })
  removeVocabIds?: string[];
}
