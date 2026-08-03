import { IsBoolean, IsOptional, IsString } from "class-validator";

export class PageStatusEntryDto {
  @IsBoolean()
  disabled!: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}
