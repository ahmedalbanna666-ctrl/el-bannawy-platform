import { Controller, Get, UseGuards } from "@nestjs/common";
import { TeachersService, type MyGradesResponse } from "./teachers.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("teachers")
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get("my-grades")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER")
  async getMyGrades(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<MyGradesResponse>> {
    const data = await this.teachersService.getMyGrades(userId);
    return successResponse(data, "Teacher grades retrieved");
  }
}
