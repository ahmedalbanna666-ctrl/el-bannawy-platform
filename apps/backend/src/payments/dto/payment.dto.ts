import { IsString, IsInt, IsOptional, IsBoolean, Min, IsEnum } from "class-validator";

export class CheckoutDto {
  @IsString()
  @IsEnum(["COINS", "LESSON", "UNIT", "LIVE_PRIVATE_PLAN_A", "LIVE_PRIVATE_PLAN_B", "LIVE_GROUP_PLAN_A", "LIVE_GROUP_PLAN_B", "LIVE_ONE_TIME", "LIVE_FREE"])
  productType!: string;

  @IsString()
  productId!: string;

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Live booking context: { scheduleId?, dayIds?, groupId?, dateFrom?, dateTo? } */
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class SubmitPaymentProofDto {
  @IsString()
  paymentId!: string;

  @IsString()
  gatewayRef!: string;

  @IsString()
  senderNumber!: string;

  @IsString()
  transactionRef!: string;

  @IsOptional()
  @IsString()
  screenshot?: string;
}

export class ReviewPaymentDto {
  @IsString()
  @IsEnum(["APPROVED", "REJECTED"])
  decision!: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class VerifyPaymentDto {
  @IsString()
  checkoutId!: string;

  @IsString()
  gatewayRef!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsString()
  @IsEnum(["PERCENTAGE", "FIXED"])
  discountType!: string;

  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  applicableProducts?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ValidateCouponDto {
  @IsString()
  couponCode!: string;
}
