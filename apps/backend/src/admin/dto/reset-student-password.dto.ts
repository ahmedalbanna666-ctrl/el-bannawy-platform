import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class ResetStudentPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
