import { IsNumber, Min, IsOptional } from "class-validator";

export class UpdateVideoProgressDto {
  @IsNumber()
  @Min(0)
  currentPosition!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  watchedSeconds?: number;
}
