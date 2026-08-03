import { IsOptional, IsString, IsBoolean, IsNumber, IsArray, ValidateNested, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class FontSettings {
  @IsOptional()
  @IsString()
  arabic?: string;

  @IsOptional()
  @IsString()
  english?: string;
}

export class ColorSettings {
  @IsOptional()
  @IsString()
  primary?: string;

  @IsOptional()
  @IsString()
  cardBg?: string;

  @IsOptional()
  @IsString()
  cardBgDark?: string;
}

export class BackgroundSettings {
  @IsOptional()
  @IsString()
  light?: string;

  @IsOptional()
  @IsString()
  dark?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class SidebarSettings {
  @IsOptional()
  @IsString()
  backgroundImage?: string;
}

export class SplashScreenSettings {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export type CardBorderSide = "left" | "top" | "right" | "bottom";

export class CardBorderGroupSettings {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  colorDark?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  width?: number;

  @IsOptional()
  @IsString()
  side?: CardBorderSide;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pages?: string[];
}

export class CardBorderGroupsSettings {
  @IsOptional()
  @ValidateNested()
  @Type(() => CardBorderGroupSettings)
  staff?: CardBorderGroupSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardBorderGroupSettings)
  student?: CardBorderGroupSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardBorderGroupSettings)
  auth?: CardBorderGroupSettings;
}

export class CardBorderSettings {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  colorDark?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  width?: number;

  @IsOptional()
  @IsString()
  side?: CardBorderSide;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardBorderGroupsSettings)
  groups?: CardBorderGroupsSettings;
}

export class SidebarBorderSettings {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  width?: number;
}

export class UpdateUiSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FontSettings)
  fonts?: FontSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => ColorSettings)
  colors?: ColorSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => BackgroundSettings)
  backgrounds?: BackgroundSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => SidebarSettings)
  sidebar?: SidebarSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => SplashScreenSettings)
  splashScreen?: SplashScreenSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardBorderSettings)
  cardBorder?: CardBorderSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => SidebarBorderSettings)
  sidebarBorder?: SidebarBorderSettings;
}
