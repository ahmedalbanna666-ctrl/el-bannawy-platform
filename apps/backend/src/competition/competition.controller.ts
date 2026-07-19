import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CompetitionService } from "./competition.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../common/guards/permission.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  UpdateCompetitionStatusDto,
  InviteStudentsDto,
  SubmitCompetitionDto,
} from "./competition.dto";

@Controller("competitions")
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Get("teacher")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async getTeacherCompetitions(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.competitionService.listTeacherCompetitions(userId);
    return successResponse(data, "Teacher competitions retrieved successfully");
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async createCompetition(
    @Body() dto: CreateCompetitionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.createCompetition(dto, userId);
    return successResponse(data, "Competition created successfully");
  }

  @Get("teacher/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async getTeacherCompetition(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.getCompetitionForTeacher(id, userId);
    return successResponse(data, "Competition retrieved successfully");
  }

  @Patch("teacher/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async updateCompetition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.updateCompetition(id, dto, userId);
    return successResponse(data, "Competition updated successfully");
  }

  @Delete("teacher/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompetition(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.competitionService.deleteCompetition(id, userId);
  }

  @Patch("teacher/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionStatusDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.updateStatus(id, dto, userId);
    return successResponse(data, "Competition status updated");
  }

  @Post("teacher/:id/invite")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async inviteStudents(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InviteStudentsDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.inviteStudents(id, dto, userId);
    return successResponse(data, "Students invited successfully");
  }

  @Post("teacher/:id/finalize")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission("competition.manage")
  async finalize(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.finalize(id, userId);
    return successResponse(data, "Competition finalized successfully");
  }

  @Get("student")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async getStudentCompetitions(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.competitionService.listStudentCompetitions(userId);
    return successResponse(data, "Student competitions retrieved successfully");
  }

  @Get("student/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async getStudentCompetition(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.getStudentCompetition(id, userId);
    return successResponse(data, "Competition retrieved successfully");
  }

  @Post("student/:id/accept")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async accept(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.acceptCompetition(id, userId);
    return successResponse(data, "Joined competition successfully");
  }

  @Post("student/:id/submit")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async submit(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitCompetitionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.submitCompetition(id, dto, userId);
    return successResponse(data, "Submission recorded successfully");
  }

  @Get(":id/leaderboard")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async getLeaderboard(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.competitionService.getLeaderboard(id);
    return successResponse(data, "Leaderboard retrieved successfully");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("competition.view")
  async getCompetition(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.competitionService.getStudentCompetition(id, userId);
    return successResponse(data, "Competition retrieved successfully");
  }
}
