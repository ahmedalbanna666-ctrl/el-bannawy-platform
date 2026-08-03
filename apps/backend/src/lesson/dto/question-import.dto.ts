import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsBoolean, MaxLength, IsIn } from "class-validator";
import { Type } from "class-transformer";
import type { QuestionPreviewType } from "../../document-import/types/question-preview.types";

const QUESTION_TYPES = [
  "MCQ", "TRUE_FALSE", "FILL_IN_BLANK", "GRAMMAR",
  "READING", "READING_QUESTION", "DIALOGUE", "DIALOGUE_QUESTION",
  "PARAGRAPH", "WRITING", "MATCHING", "ORDERING",
  "DRAG_DROP", "SHORT_ANSWER", "ESSAY", "UNKNOWN",
] as const;

class CommitQuestionOptionDto {
  @IsString()
  label!: string;

  @IsString()
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

class CommitQuestionItemDto {
  @IsString()
  clientDraftId!: string;

  @IsString()
  groupId!: string;

  @IsString()
  @IsIn(QUESTION_TYPES)
  questionType!: QuestionPreviewType;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitQuestionOptionDto)
  options!: CommitQuestionOptionDto[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptableAnswers?: string[];

  @IsOptional()
  @IsString()
  passageText?: string;

  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsString()
  @IsIn(["VALID", "WARNING", "INVALID"])
  status!: "VALID" | "WARNING" | "INVALID";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}

class CommitQuestionGroupDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitQuestionItemDto)
  items!: CommitQuestionItemDto[];
}

export class CommitQuestionImportDto {
  @IsString()
  parserProfile!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitQuestionGroupDto)
  groups!: CommitQuestionGroupDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}
