import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
  ) {}

  @Get("my")
  @UseGuards(JwtAuthGuard)
  async getMyReport(
    @CurrentUser() userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.reportsService.getStudentReport(userId, Number(page) || 1, Number(limit) || 20);
    return successResponse(data, "Student report retrieved successfully");
  }

  @Get("student/:studentId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR", "STAFF")
  async getStudentReport(
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (viewer?.role === "TEACHER") {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { gradeId: true },
      });
      if (student?.gradeId) {
        await this.academicContext.verifyTeacherGradeAccess(userId, student.gradeId);
      }
    }
    const data = await this.reportsService.getStudentReport(studentId, Number(page) || 1, Number(limit) || 20);
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
