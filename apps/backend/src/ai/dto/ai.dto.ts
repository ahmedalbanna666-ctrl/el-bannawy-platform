import { IsString, IsOptional, MaxLength, IsUUID, IsInt, Min, Max } from "class-validator";

export class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unitId?: string;
}

export class CreateFeedbackDto {
  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class RegenerateMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;
}
