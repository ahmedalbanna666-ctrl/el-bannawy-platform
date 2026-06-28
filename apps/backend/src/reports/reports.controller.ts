import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("my")
  @UseGuards(JwtAuthGuard)
  async getMyReport(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.reportsService.getStudentReport(userId);
    return successResponse(data, "Student report retrieved successfully");
  }

  @Get("student/:studentId")
  @UseGuards(JwtAuthGuard)
  async getStudentReport(
    @Param("studentId") studentId: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.reportsService.getStudentReport(studentId);
    return successResponse(data, "Student report retrieved successfully");
  }

  @Get("teacher")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getTeacherReport(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.reportsService.getTeacherReport(userId);
    return successResponse(data, "Teacher report retrieved successfully");
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getAdminReport(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.reportsService.getAdminReport(userId);
    return successResponse(data, "Admin report retrieved successfully");
  }
}
