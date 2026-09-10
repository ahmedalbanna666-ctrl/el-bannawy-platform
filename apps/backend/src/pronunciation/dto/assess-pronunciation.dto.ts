import { IsString, IsOptional, IsIn, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";
import { PRONUNCIATION_PROVIDERS } from "../pronunciation.types";

export class AssessPronunciationDto {
  @IsString()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => (obj.expectedText as string) ?? (obj.expected_text as string))
  expectedText!: string;

  @IsOptional()
  @IsString()
  expected_text?: string;

  @IsOptional()
  @IsIn([...PRONUNCIATION_PROVIDERS])
  provider?: string;

  @IsOptional()
  @IsString()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => (obj.referencePhonemes as string) ?? (obj.reference_phonemes as string))
  referencePhonemes?: string;

  @IsOptional()
  @IsString()
  reference_phonemes?: string;

  @IsOptional()
  @IsInt()
  @Min(8000)
  @Max(48000)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const v = (obj.sampleRate as number | undefined) ?? (obj.sample_rate as number | string | undefined);
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : v;
  })
  sampleRate?: number;

  @IsOptional()
  sample_rate?: string | number;

  @IsOptional()
  @IsString()
  language?: string;
}
