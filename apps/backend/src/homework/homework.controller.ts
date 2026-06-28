import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { HomeworkService } from "./homework.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SubmitHomeworkDto } from "./dto/submit-homework.dto";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { SaveHomeworkDto } from "./dto/save-homework.dto";

@Controller("homework")
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  // --- Teacher/Admin Management ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createHomework(
    @Body() dto: CreateHomeworkDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.createHomework(dto);
    return successResponse(data, "Homework created successfully");
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async updateHomework(
    @Param("id") id: string,
    @Body() dto: UpdateHomeworkDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.updateHomework(id, dto);
    return successResponse(data, "Homework updated successfully");
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async deleteHomework(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.deleteHomework(id);
    return successResponse(data, "Homework deleted successfully");
  }

  // --- Analytics (Teacher/Admin) ---

  @Get(":lessonId/analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getAnalytics(
    @Param("lessonId") lessonId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getAnalytics(lessonId);
    return successResponse(data, "Analytics retrieved successfully");
  }

  // --- Student Endpoints ---

  @Get(":lessonId")
  @UseGuards(JwtAuthGuard)
  async getHomework(@Param("lessonId") lessonId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getHomework(lessonId);
    return successResponse(data, "Homework retrieved successfully");
  }

  @Get(":lessonId/questions")
  @UseGuards(JwtAuthGuard)
  async getQuestions(@Param("lessonId") lessonId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getQuestions(lessonId);
    return successResponse(data, "Questions retrieved successfully");
  }

  @Get(":lessonId/status")
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getStatus(lessonId, userId);
    return successResponse(data, "Homework status retrieved successfully");
  }

  @Patch(":lessonId/save")
  @UseGuards(JwtAuthGuard)
  async saveProgress(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: SaveHomeworkDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.saveProgress(lessonId, userId, dto.answers);
    return successResponse(data, "Progress saved successfully");
  }

  @Post(":lessonId/start")
  @UseGuards(JwtAuthGuard)
  async startAttempt(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.startAttempt(lessonId, userId);
    return successResponse(data, "Homework attempt started");
  }

  @Post(":lessonId/submit")
  @UseGuards(JwtAuthGuard)
  async submitHomework(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: SubmitHomeworkDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.submitHomework(lessonId, userId, dto.answers, dto.response);
    return successResponse(data, "Homework submitted successfully");
  }

  @Get(":lessonId/result")
  @UseGuards(JwtAuthGuard)
  async getResult(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getResult(lessonId, userId);
    return successResponse(data, "Homework result retrieved successfully");
  }

  @Get(":lessonId/history")
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.getHistory(lessonId, userId);
    return successResponse(data, "Homework history retrieved successfully");
  }

  @Get(":lessonId/review")
  @UseGuards(JwtAuthGuard)
  async reviewAnswers(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.homeworkService.reviewAnswers(lessonId, userId);
    return successResponse(data, "Homework review retrieved successfully");
  }
}
