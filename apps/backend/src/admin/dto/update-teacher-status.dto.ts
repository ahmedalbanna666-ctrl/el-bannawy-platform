import { IsString, IsIn, IsOptional } from "class-validator";

export class UpdateTeacherStatusDto {
  @IsString()
  @IsIn(["ACTIVE", "SUSPENDED", "BANNED", "DELETED"])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
