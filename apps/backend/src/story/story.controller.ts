import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { StoryService } from "./story.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import {
  CreateStoryDto,
  UpdateStoryDto,
  PublishStoryDto,
  CreateChapterDto,
  UpdateChapterDto,
  PublishChapterDto,
  ReorderChaptersDto,
} from "./dto/story.dto";

@Controller("stories")
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get("management")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getStoriesForManagement(
    @CurrentUser() userId: string,
    @Query("academicYearId") academicYearId?: string,
    @Query("termId") termId?: string,
    @Query("gradeId") gradeId?: string,
    @Query("educationalSystem") educationalSystem?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.storyService.getStoriesForManagement(userId, academicYearId, termId, gradeId, educationalSystem);
    return successResponse(data, "Stories retrieved successfully");
  }

  @Get("management/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getStoryForManagement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.getStoryForManagement(id, userId);
    return successResponse(data, "Story retrieved successfully");
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createStory(
    @Body() dto: CreateStoryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.createStory(dto, userId);
    return successResponse(data, "Story created successfully");
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async updateStory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.updateStory(id, dto, userId);
    return successResponse(data, "Story updated successfully");
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.storyService.deleteStory(id, userId);
  }

  @Patch(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async publishStory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PublishStoryDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.publishStory(id, dto, userId);
    return successResponse(data, "Story publish state updated");
  }

  @Post(":storyId/chapters")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createChapter(
    @Param("storyId", ParseUUIDPipe) storyId: string,
    @Body() dto: CreateChapterDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.createChapter(storyId, dto, userId);
    return successResponse(data, "Chapter created successfully");
  }

  @Patch(":storyId/chapters/:chapterId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async updateChapter(
    @Param("storyId", ParseUUIDPipe) storyId: string,
    @Param("chapterId", ParseUUIDPipe) chapterId: string,
    @Body() dto: UpdateChapterDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.updateChapter(storyId, chapterId, dto, userId);
    return successResponse(data, "Chapter updated successfully");
  }

  @Delete(":storyId/chapters/:chapterId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChapter(
    @Param("storyId", ParseUUIDPipe) storyId: string,
    @Param("chapterId", ParseUUIDPipe) chapterId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.storyService.deleteChapter(storyId, chapterId, userId);
  }

  @Patch(":storyId/chapters/:chapterId/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async publishChapter(
    @Param("storyId", ParseUUIDPipe) storyId: string,
    @Param("chapterId", ParseUUIDPipe) chapterId: string,
    @Body() dto: PublishChapterDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.publishChapter(storyId, chapterId, dto, userId);
    return successResponse(data, "Chapter publish state updated");
  }

  @Patch(":storyId/chapters/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async reorderChapters(
    @Param("storyId", ParseUUIDPipe) storyId: string,
    @Body() dto: ReorderChaptersDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    await this.storyService.reorderChapters(storyId, dto, userId);
    return successResponse(null, "Chapters reordered");
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getStoriesForStudent(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.storyService.getStoriesForStudent(userId);
    return successResponse(data, "Stories retrieved");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getStoryForStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.storyService.getStoryForStudent(id, userId);
    return successResponse(data, "Story retrieved");
  }
}
