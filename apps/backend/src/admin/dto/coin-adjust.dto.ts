import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CoinAdjustDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
