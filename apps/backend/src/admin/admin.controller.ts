import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { QueryTeachersDto } from "./dto/query-teachers.dto";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { UpdateTeacherStatusDto } from "./dto/update-teacher-status.dto";
import { AssignGradesDto } from "./dto/assign-grades.dto";
import { GrantPermissionDto } from "./dto/grant-permission.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateTermDto } from "./dto/update-term.dto";
import { QueryStudentsDto } from "./dto/query-students.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpdateStudentPhoneDto } from "./dto/update-student-phone.dto";
import { ResetStudentPasswordDto } from "./dto/reset-student-password.dto";
import { CoinAdjustDto } from "./dto/coin-adjust.dto";
import { XpAdjustDto } from "./dto/xp-adjust.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMINISTRATOR")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stages")
  async listStages(
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.listStages();
    return successResponse(data);
  }

  @Get("teachers")
  async listTeachers(
    @Query() query: QueryTeachersDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.listTeachers(query);
    return successResponse(data);
  }

  @Get("teachers/:id")
  async getTeacher(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getTeacher(id);
    return successResponse(data);
  }

  @Post("teachers")
  async createTeacher(
    @Body() dto: CreateTeacherDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.createTeacher(dto, userId);
    return successResponse(data, "Teacher created successfully");
  }

  @Patch("teachers/:id")
  async updateTeacher(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeacherDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateTeacher(id, dto);
    return successResponse(data, "Teacher updated successfully");
  }

  @Patch("teachers/:id/status")
  async updateTeacherStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeacherStatusDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateTeacherStatus(id, dto);
    return successResponse(data, "Teacher status updated successfully");
  }

  @Post("teachers/:id/grades")
  async assignGrades(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignGradesDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.assignGrades(id, dto);
    return successResponse(data, "Grades assigned successfully");
  }

  @Get("teachers/:id/permissions")
  async getTeacherPermissions(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<{ grantedPermissions: string[] }>> {
    const grantedPermissions =
      await this.adminService.getTeacherPermissions(id);
    return successResponse({ grantedPermissions });
  }

  @Post("teachers/:id/permissions/grant")
  async grantTeacherPermission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    await this.adminService.grantTeacherPermission(userId, id, dto.permission);
    return successResponse({}, "Permission granted successfully");
  }

  @Post("teachers/:id/permissions/revoke")
  async revokeTeacherPermission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    await this.adminService.revokeTeacherPermission(userId, id, dto.permission);
    return successResponse({}, "Permission revoked successfully");
  }

  @Get("settings")
  async getSettings(
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getSettings();
    return successResponse(data);
  }

  @Patch("settings")
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateSettings(dto);
    return successResponse(data, "Settings updated successfully");
  }

  @Get("academic-years")
  async listAcademicYears(
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.listAcademicYears();
    return successResponse(data);
  }

  @Post("academic-years")
  async createAcademicYear(
    @Body() dto: CreateAcademicYearDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.createAcademicYear(dto);
    return successResponse(data, "Academic year created successfully");
  }

  @Patch("academic-years/:id")
  async updateAcademicYear(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicYearDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateAcademicYear(id, dto);
    return successResponse(data, "Academic year updated successfully");
  }

  @Delete("academic-years/:id")
  async deleteAcademicYear(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.deleteAcademicYear(id);
    return successResponse(data, "Academic year deleted successfully");
  }

  @Post("academic-years/:academicYearId/terms")
  async createTerm(
    @Param("academicYearId", ParseUUIDPipe) academicYearId: string,
    @Body() dto: CreateTermDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.createTerm(academicYearId, dto);
    return successResponse(data, "Term created successfully");
  }

  @Patch("terms/:id")
  async updateTerm(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTermDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateTerm(id, dto);
    return successResponse(data, "Term updated successfully");
  }

  @Delete("terms/:id")
  async deleteTerm(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.deleteTerm(id);
    return successResponse(data, "Term deleted successfully");
  }

  @Get("students")
  async listStudents(
    @Query() query: QueryStudentsDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.listStudents(query);
    return successResponse(data);
  }

  @Get("students/:id")
  async getStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getStudent(id);
    return successResponse(data);
  }

  @Patch("students/:id")
  async updateStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateStudent(id, dto);
    return successResponse(data, "Student updated successfully");
  }

  @Patch("students/:id/phone")
  async updateStudentPhone(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentPhoneDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateStudentPhone(id, dto);
    return successResponse(data, "Phone number updated successfully");
  }

  @Post("students/:id/reset-password")
  async resetStudentPassword(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResetStudentPasswordDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.resetStudentPassword(id, dto);
    return successResponse(data, "Password reset successfully");
  }

  @Post("students/:id/reset-device")
  async resetStudentDevice(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.resetStudentDevice(id);
    return successResponse(data, "Device reset successfully");
  }

  @Post("students/:id/coins/add")
  async addCoins(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CoinAdjustDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.addCoins(id, dto);
    return successResponse(data, "Coins added successfully");
  }

  @Post("students/:id/coins/remove")
  async removeCoins(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CoinAdjustDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.removeCoins(id, dto);
    return successResponse(data, "Coins removed successfully");
  }

  @Post("students/:id/xp/adjust")
  async adjustXp(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: XpAdjustDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.adjustXp(id, dto);
    return successResponse(data, "XP adjusted successfully");
  }

  @Patch("students/:id/status")
  async updateStudentStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeacherStatusDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.updateStudentStatus(id, dto);
    return successResponse(data, "Student status updated successfully");
  }

  @Get("students/:id/progress")
  async getStudentProgress(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getStudentProgress(id);
    return successResponse(data);
  }

  @Get("students/:id/attendance")
  async getStudentAttendance(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getStudentAttendance(id);
    return successResponse(data);
  }

  @Get("students/:id/login-history")
  async getStudentLoginHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getStudentLoginHistory(id);
    return successResponse(data);
  }

  @Get("students/:id/subscription")
  async getStudentSubscription(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.adminService.getStudentSubscription(id);
    return successResponse(data);
  }
}
