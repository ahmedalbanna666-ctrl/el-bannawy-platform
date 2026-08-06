import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsObject,
} from "class-validator";

export class CreateTeachingStyleDto {
  @IsString()
  name!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  greetingStyle?: string;

  @IsOptional()
  @IsString()
  explanationStyle?: string;

  @IsOptional()
  @IsString()
  encouragementPhrases?: string;

  @IsOptional()
  @IsString()
  correctionStyle?: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  arabicUsage?: string;

  @IsOptional()
  @IsString()
  englishUsage?: string;

  @IsOptional()
  @IsString()
  emojiPolicy?: string;

  @IsOptional()
  @IsString()
  examplesPolicy?: string;

  @IsOptional()
  @IsString()
  hintsPolicy?: string;

  @IsOptional()
  @IsString()
  responseLength?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTeachingStyleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  greetingStyle?: string;

  @IsOptional()
  @IsString()
  explanationStyle?: string;

  @IsOptional()
  @IsString()
  encouragementPhrases?: string;

  @IsOptional()
  @IsString()
  correctionStyle?: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  arabicUsage?: string;

  @IsOptional()
  @IsString()
  englishUsage?: string;

  @IsOptional()
  @IsString()
  emojiPolicy?: string;

  @IsOptional()
  @IsString()
  examplesPolicy?: string;

  @IsOptional()
  @IsString()
  hintsPolicy?: string;

  @IsOptional()
  @IsString()
  responseLength?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateModelConfigDto {
  @IsString()
  provider!: string;

  @IsString()
  modelName!: string;

  @IsString()
  apiKey!: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  maxTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  supportsStreaming?: boolean;
}

export class UpdateModelConfigDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  maxTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  supportsStreaming?: boolean;
}

export class CreateCreditPlanDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  creditsPerQuestion?: number;

  @IsOptional()
  @IsInt()
  creditsPerSession?: number;

  @IsOptional()
  @IsInt()
  freeCredits?: number;

  @IsOptional()
  @IsString()
  resetPeriod?: string;

  @IsOptional()
  @IsInt()
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  weeklyLimit?: number;

  @IsOptional()
  @IsInt()
  monthlyLimit?: number;

  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCreditPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  creditsPerQuestion?: number;

  @IsOptional()
  @IsInt()
  creditsPerSession?: number;

  @IsOptional()
  @IsInt()
  freeCredits?: number;

  @IsOptional()
  @IsString()
  resetPeriod?: string;

  @IsOptional()
  @IsInt()
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  weeklyLimit?: number;

  @IsOptional()
  @IsInt()
  monthlyLimit?: number;

  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePackageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  planType?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  creditsPerQuestion?: number;

  @IsOptional()
  @IsInt()
  creditsPerSession?: number;

  @IsOptional()
  @IsInt()
  freeCredits?: number;

  @IsOptional()
  @IsString()
  resetPeriod?: string;

  @IsOptional()
  @IsInt()
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  weeklyLimit?: number;

  @IsOptional()
  @IsInt()
  monthlyLimit?: number;

  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  modelAccess?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  creditPlanId?: string;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  planType?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  creditsPerQuestion?: number;

  @IsOptional()
  @IsInt()
  creditsPerSession?: number;

  @IsOptional()
  @IsInt()
  freeCredits?: number;

  @IsOptional()
  @IsString()
  resetPeriod?: string;

  @IsOptional()
  @IsInt()
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  weeklyLimit?: number;

  @IsOptional()
  @IsInt()
  monthlyLimit?: number;

  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  modelAccess?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  creditPlanId?: string;
}

export class CreatePromptTemplateDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  systemPrompt!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewPromptDto {
  @IsString()
  systemPrompt!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class TestPromptDto {
  @IsString()
  systemPrompt!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  providerId?: string;
}

export class CreateFeedbackDto {
  @IsString()
  messageId!: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UsageLogQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  success?: boolean;
}

export class ModerationLogQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  range?: "day" | "week" | "month" | "year";
}

export class AddCreditsDto {
  @IsString()
  userId!: string;

  @IsInt()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BuyCreditsDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  amount!: number;
}
