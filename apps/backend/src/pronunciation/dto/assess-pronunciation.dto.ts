import { IsString, IsOptional, IsIn, IsInt, Min, Max } from "class-validator";
import { PRONUNCIATION_PROVIDERS } from "../pronunciation.types";

export class AssessPronunciationDto {
  @IsString()
  expectedText!: string;

  @IsOptional()
  @IsIn([...PRONUNCIATION_PROVIDERS])
  provider?: "gopt" | "forced-alignment" | "asr" | "local";

  /// Optional reference ARPABET phonemes, JSON-encoded array (e.g. ["HH","AH","L","OW"]).
  @IsOptional()
  @IsString()
  referencePhonemes?: string;

  @IsOptional()
  @IsInt()
  @Min(8000)
  @Max(48000)
  sampleRate?: number;

  @IsOptional()
  @IsString()
  language?: string;
}
