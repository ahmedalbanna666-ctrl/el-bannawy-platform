import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class AddVideoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  youtubeUrl?: string;

  getResolvedUrl(): string {
    return this.url ?? this.youtubeUrl ?? "";
  }
}
