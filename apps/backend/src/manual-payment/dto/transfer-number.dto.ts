import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateTransferNumberDto {
  @IsString()
  gateway!: string;

  @IsString()
  label!: string;

  @IsString()
  number!: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

export class UpdateTransferNumberDto {
  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
