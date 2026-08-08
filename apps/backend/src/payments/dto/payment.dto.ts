import { IsString, IsInt, IsOptional, IsBoolean, Min, IsEnum, Matches } from "class-validator";

export class CheckoutDto {
  @IsString()
  @Matches(/^(COINS|LESSON|UNIT|LIVE_[A-Z][A-Z0-9_]*)$/)
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
