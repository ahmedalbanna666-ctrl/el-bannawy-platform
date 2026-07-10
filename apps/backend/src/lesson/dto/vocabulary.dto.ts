import { IsString, IsOptional, MaxLength } from "class-validator";

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
