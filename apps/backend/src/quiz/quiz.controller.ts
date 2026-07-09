import { Controller, Get, Post, Patch, Delete, Param, ParseUUIDPipe, Body, UseGuards } from "@nestjs/common";
import { QuizService } from "./quiz.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { SaveQuizDto } from "./dto/save-quiz.dto";

@Controller("quizzes")
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // --- Teacher/Admin Management ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createQuiz(
    @Body() dto: CreateQuizDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.createQuiz(dto, userId);
    return successResponse(data, "Quiz created successfully");
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async updateQuiz(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.updateQuiz(id, dto, userId);
    return successResponse(data, "Quiz updated successfully");
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async deleteQuiz(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.deleteQuiz(id, userId);
    return successResponse(data, "Quiz deleted successfully");
  }

  // --- Analytics ---

  @Get(":lessonId/analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getAnalytics(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getAnalytics(lessonId, userId);
    return successResponse(data, "Analytics retrieved successfully");
  }

  // --- Student Endpoints ---

  @Get(":lessonId")
  @UseGuards(JwtAuthGuard)
  async getQuiz(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getQuiz(lessonId, userId);
    return successResponse(data, "Quiz retrieved successfully");
  }

  @Get(":lessonId/questions")
  @UseGuards(JwtAuthGuard)
  async getQuestions(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getQuestions(lessonId, userId);
    return successResponse(data, "Questions retrieved successfully");
  }

  @Get(":lessonId/unlock-status")
  @UseGuards(JwtAuthGuard)
  async getUnlockStatus(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getUnlockStatus(lessonId, userId);
    return successResponse(data, "Unlock status retrieved successfully");
  }

  @Patch(":lessonId/save")
  @UseGuards(JwtAuthGuard)
  async saveProgress(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: SaveQuizDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.saveProgress(lessonId, userId, dto.answers);
    return successResponse(data, "Progress saved successfully");
  }

  @Post(":lessonId/start")
  @UseGuards(JwtAuthGuard)
  async startAttempt(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.startAttempt(lessonId, userId);
    return successResponse(data, "Quiz attempt started");
  }

  @Post(":lessonId/submit")
  @UseGuards(JwtAuthGuard)
  async submitQuiz(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: SubmitQuizDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.submitQuiz(lessonId, userId, dto.answers, dto.response);
    return successResponse(data, "Quiz submitted successfully");
  }

  @Get(":lessonId/result")
  @UseGuards(JwtAuthGuard)
  async getResult(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getResult(lessonId, userId);
    return successResponse(data, "Quiz result retrieved successfully");
  }

  @Get(":lessonId/history")
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.getHistory(lessonId, userId);
    return successResponse(data, "Quiz history retrieved successfully");
  }

  @Get(":lessonId/review")
  @UseGuards(JwtAuthGuard)
  async reviewAnswers(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.quizService.reviewAnswers(lessonId, userId);
    return successResponse(data, "Quiz review retrieved successfully");
  }
}
