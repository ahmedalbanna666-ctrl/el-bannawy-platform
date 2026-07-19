import { IsString, IsNotEmpty } from "class-validator";

export class GrantPermissionDto {
  @IsString()
  @IsNotEmpty()
  permission!: string;
}
