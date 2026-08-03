import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from "class-validator";

export class CreateCampaignDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  targetStageId?: string;

  @IsOptional()
  @IsString()
  targetGradeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxViewsPerDay?: number;

  @IsOptional()
  @IsString()
  showDaysPerWeek?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  unitRewardPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  termRewardPercent?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  targetStageId?: string;

  @IsOptional()
  @IsString()
  targetGradeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxViewsPerDay?: number;

  @IsOptional()
  @IsString()
  showDaysPerWeek?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  unitRewardPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  termRewardPercent?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;
}

export class UpdateReferralStatusDto {
  @IsString()
  status!: "APPROVED" | "REJECTED";
}
