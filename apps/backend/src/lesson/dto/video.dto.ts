import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class UpdateLessonVideoDto {
  @IsOptional()
  @IsBoolean()
  showThumbnail?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}

export class MoveLessonVideoDto {
  @IsIn(["up", "down"])
  direction!: "up" | "down";
}
