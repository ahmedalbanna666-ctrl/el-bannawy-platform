import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Delete, UseGuards, Body, Query } from "@nestjs/common";
import { CurriculumService } from "./curriculum.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PermissionGuard } from "../common/guards/permission.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { PERMISSIONS } from "@el-bannawy/shared";
import { IsInt, Min } from "class-validator";
import {
  CreateUnitDto,
  UpdateUnitDto,
  CreateLessonDto,
  UpdateLessonDto,
} from "./dto/curriculum.dto";

class UpdateProgressDto {
  @IsInt()
  @Min(0)
  progress!: number;
}

@Controller("curriculum")
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCurriculum(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.curriculumService.getCurriculum(userId);
    return successResponse(data, "Curriculum retrieved successfully");
  }

  @Get("continue-learning")
  @UseGuards(JwtAuthGuard)
  async getContinueLearning(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.getContinueLearning(userId);
    return successResponse(data, "Continue learning data retrieved successfully");
  }

  @Get("progress")
  @UseGuards(JwtAuthGuard)
  async getOverallProgress(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.getOverallProgress(userId);
    return successResponse(data, "Overall progress retrieved successfully");
  }

  @Get("progress/:lessonId")
  @UseGuards(JwtAuthGuard)
  async getLessonProgress(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.getLessonProgress(lessonId, userId);
    return successResponse(data, "Lesson progress retrieved successfully");
  }

  @Patch("progress/:lessonId")
  @UseGuards(JwtAuthGuard)
  async updateLessonProgress(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.updateLessonProgress(lessonId, userId, dto.progress);
    return successResponse(data, "Lesson progress updated successfully");
  }

  // ── Unit Management ─────────────────────────────────────────────

  @Get("units")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getUnitsForManagement(
    @CurrentUser() userId: string,
    @Query("academicYearId") academicYearId?: string,
    @Query("termId") termId?: string,
    @Query("gradeId") gradeId?: string,
    @Query("educationalSystem") educationalSystem?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.curriculumService.getUnitsForManagement(userId, academicYearId, termId, gradeId, educationalSystem);
    return successResponse(data, "Units retrieved successfully");
  }

  @Get("units/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getUnitForManagement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.getUnitForManagement(id, userId);
    return successResponse(data, "Unit retrieved successfully");
  }

  @Post("units")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.UNITS_CREATE)
  async createUnit(
    @Body() dto: CreateUnitDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.createUnit(dto, userId);
    return successResponse(data, "Unit created successfully");
  }

  @Patch("units/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.UNITS_EDIT)
  async updateUnit(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.updateUnit(id, dto, userId);
    return successResponse(data, "Unit updated successfully");
  }

  @Delete("units/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.UNITS_DELETE)
  async deleteUnit(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.deleteUnit(id, userId);
    return successResponse(data, "Unit deleted successfully");
  }

  // ── Lesson Management ───────────────────────────────────────────

  @Post("lessons")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.LESSONS_CREATE)
  async createLesson(
    @Body() dto: CreateLessonDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.createLesson(dto, userId);
    return successResponse(data, "Lesson created successfully");
  }

  @Patch("lessons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.LESSONS_EDIT)
  async updateLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.updateLesson(id, dto, userId);
    return successResponse(data, "Lesson updated successfully");
  }

  @Delete("lessons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @RequirePermission(PERMISSIONS.LESSONS_DELETE)
  async deleteLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.deleteLesson(id, userId);
    return successResponse(data, "Lesson deleted successfully");
  }
}
