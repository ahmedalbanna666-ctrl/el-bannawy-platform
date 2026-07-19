import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum CompetitionMode {
  QUIZ = "QUIZ",
  XP_SPRINT = "XP_SPRINT",
}

export enum CompetitionStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  FINALIZED = "FINALIZED",
}

export enum ParticipantStatus {
  INVITED = "INVITED",
  JOINED = "JOINED",
  SUBMITTED = "SUBMITTED",
}

export class CompetitionQuestionDto {
  @IsString()
  question!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;
}

export class CreateCompetitionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CompetitionMode)
  mode!: CompetitionMode;

  @IsUUID()
  gradeId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  termId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coinReward?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitionQuestionDto)
  questions?: CompetitionQuestionDto[];
}

export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CompetitionMode)
  mode?: CompetitionMode;

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
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coinReward?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitionQuestionDto)
  questions?: CompetitionQuestionDto[];
}

export class UpdateCompetitionStatusDto {
  @IsEnum(CompetitionStatus)
  status!: CompetitionStatus;
}

export class InviteStudentsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  studentIds!: string[];
}

export class SubmitCompetitionDto {
  @IsArray()
  answers!: { questionIndex: number; selectedIndex: number }[];

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
