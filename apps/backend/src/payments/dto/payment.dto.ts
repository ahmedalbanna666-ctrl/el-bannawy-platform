import { IsString, IsInt, IsOptional, IsBoolean, Min, IsEnum } from "class-validator";

export class CheckoutDto {
  @IsString()
  productType!: string;

  @IsString()
  productId!: string;

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VerifyPaymentDto {
  @IsString()
  checkoutId!: string;

  @IsString()
  gatewayRef!: string;
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
