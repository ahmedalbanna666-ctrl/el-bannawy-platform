import { IsString, IsNotEmpty } from "class-validator";

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
