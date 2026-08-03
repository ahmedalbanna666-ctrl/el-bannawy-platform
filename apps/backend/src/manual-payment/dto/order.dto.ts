import { IsString, IsInt, IsOptional } from "class-validator";

export class SubmitOrderDto {
  @IsString()
  packageId!: string;

  @IsInt()
  amount!: number;

  @IsInt()
  coinAmount!: number;

  @IsString()
  gateway!: string;

  @IsString()
  transferNumber!: string;

  @IsString()
  senderNumber!: string;

  @IsString()
  transactionRef!: string;

  @IsOptional()
  @IsString()
  screenshot?: string;
}

export class ReviewOrderDto {
  @IsString()
  status!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  adminNote?: string;
}
