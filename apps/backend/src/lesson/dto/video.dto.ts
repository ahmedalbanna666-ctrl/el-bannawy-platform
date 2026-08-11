import { IsBoolean, IsOptional } from "class-validator";

export class UpdateLessonVideoDto {
  @IsOptional()
  @IsBoolean()
  showThumbnail?: boolean;
}
