import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsBoolean, IsUrl } from "class-validator";

export class CreateKnowledgeSourceDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["PDF", "DOCX", "TXT", "MD", "JSON", "URL", "LESSON", "UNIT", "STORY", "REVIEW"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ["http", "https"], require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateKnowledgeSourceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["PDF", "DOCX", "TXT", "MD", "JSON", "URL", "LESSON", "UNIT", "STORY", "REVIEW"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ["http", "https"], require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ReindexSourceDto {
  @IsOptional()
  @IsString()
  sourceId?: string;
}
