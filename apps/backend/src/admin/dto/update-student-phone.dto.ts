import { IsString, IsNotEmpty } from "class-validator";

export class UpdateStudentPhoneDto {
  @IsString()
  @IsNotEmpty()
  newMobileNumber!: string;
}
