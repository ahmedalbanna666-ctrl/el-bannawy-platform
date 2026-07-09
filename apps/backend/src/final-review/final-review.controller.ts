import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { FinalReviewService } from "./final-review.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateFinalReviewDto, UpdateFinalReviewDto, PublishDto, CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from "./dto/final-review.dto";

@Controller("final-reviews")
export class FinalReviewController {
  constructor(private readonly service: FinalReviewService) {}

  @Get("management")
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async getForManagement(@CurrentUser() userId: string, @Query("academicYearId") a?: string, @Query("termId") t?: string, @Query("gradeId") g?: string, @Query("educationalSystem") e?: string): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.service.getForManagement(userId, a, t, g, e), "Retrieved");
  }

  @Get("management/:id")
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async getForManagementById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getForManagementById(id, userId), "Retrieved");
  }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async create(@Body() dto: CreateFinalReviewDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.create(dto, userId), "Created");
  }

  @Patch(":id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFinalReviewDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.update(id, dto, userId), "Updated");
  }

  @Delete(":id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<void> { await this.service.delete(id, userId); }

  @Patch(":id/publish") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async publish(@Param("id", ParseUUIDPipe) id: string, @Body() dto: PublishDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.publish(id, dto, userId), "Published");
  }

  @Post(":frId/sections") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async createSection(@Param("frId", ParseUUIDPipe) frId: string, @Body() dto: CreateSectionDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createSection(frId, dto, userId), "Section created");
  }

  @Patch(":frId/sections/:sectionId") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async updateSection(@Param("frId", ParseUUIDPipe) frId: string, @Param("sectionId", ParseUUIDPipe) sectionId: string, @Body() dto: UpdateSectionDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updateSection(frId, sectionId, dto, userId), "Section updated");
  }

  @Delete(":frId/sections/:sectionId") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSection(@Param("frId", ParseUUIDPipe) frId: string, @Param("sectionId", ParseUUIDPipe) sectionId: string, @CurrentUser() userId: string): Promise<void> { await this.service.deleteSection(frId, sectionId, userId); }

  @Patch(":frId/sections/:sectionId/publish") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async publishSection(@Param("frId", ParseUUIDPipe) frId: string, @Param("sectionId", ParseUUIDPipe) sectionId: string, @Body() dto: PublishDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.publishSection(frId, sectionId, dto, userId), "Section published");
  }

  @Patch(":frId/sections/reorder") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async reorderSections(@Param("frId", ParseUUIDPipe) frId: string, @Body() dto: ReorderSectionsDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    await this.service.reorderSections(frId, dto, userId); return successResponse(null, "Reordered");
  }

  @Get() @UseGuards(JwtAuthGuard)
  async getForStudent(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.service.getForStudent(userId), "Retrieved");
  }

  @Get(":id") @UseGuards(JwtAuthGuard)
  async getForStudentById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getForStudentById(id, userId), "Retrieved");
  }
}
