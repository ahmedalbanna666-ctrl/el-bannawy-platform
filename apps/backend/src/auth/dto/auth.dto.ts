import { IsString, IsOptional, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  englishName?: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  mobile!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  parentMobile?: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  governorate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  school?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationalSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationalStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  academicTerm?: string;
}

export class LoginDto {
  @IsString()
  mobile!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  mobile!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  mobile!: string;

  @IsString()
  verificationCode!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  newPassword!: string;
}

export class SessionParamDto {
  @IsString()
  id!: string;
}
