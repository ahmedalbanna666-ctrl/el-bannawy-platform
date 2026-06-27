import { IsInt, Min, IsOptional } from "class-validator";

export class UpdateVideoProgressDto {
  @IsInt()
  @Min(0)
  currentPosition!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;
}
