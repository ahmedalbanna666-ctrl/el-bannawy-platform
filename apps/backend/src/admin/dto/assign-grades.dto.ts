import { IsArray, IsUUID, ArrayMinSize } from "class-validator";

export class AssignGradesDto {
  @IsArray()
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  gradeIds!: string[];
}
