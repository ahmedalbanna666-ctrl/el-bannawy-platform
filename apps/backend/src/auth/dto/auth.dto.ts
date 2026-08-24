import { IsString, IsOptional, IsBoolean, IsEmail, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  englishName?: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  mobile?: string;

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
  @MaxLength(20)
  referralCode?: string;

  /** Firebase ID token minted on the client after creating the Firebase Auth user. */
  @IsOptional()
  @IsString()
  firebaseIdToken?: string;
}

export class VerifyEmailDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: "Verification code must be 6 digits",
  })
  code!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class FirebaseLoginDto {
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class LoginDto {
  @IsOptional()
  @IsString()
  identity?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class CompleteOAuthRegistrationDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  englishName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  mobile?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: "Invalid mobile number format",
  })
  parentMobile?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password?: string;

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
  @MaxLength(20)
  referralCode?: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @IsString()
  @MaxLength(255)
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(255)
  identifier!: string;

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
