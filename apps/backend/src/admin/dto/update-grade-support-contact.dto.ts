import { IsString, IsOptional } from "class-validator";

export class UpdateGradeSupportContactDto {
  @IsOptional() @IsString() supportPhone?: string | null;
  @IsOptional() @IsString() supportEmail?: string | null;
  @IsOptional() @IsString() supportWhatsapp?: string | null;
}
