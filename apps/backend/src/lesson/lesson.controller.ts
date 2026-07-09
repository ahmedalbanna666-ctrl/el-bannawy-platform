import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { LessonService } from "./lesson.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("lessons")
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getLesson(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.lessonService.getLesson(id, userId);
    return successResponse(data, "Lesson retrieved successfully");
  }

  @Get(":id/videos")
  @UseGuards(JwtAuthGuard)
  async getLessonVideos(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.lessonService.getLessonVideos(lessonId, userId);
    return successResponse(data, "Lesson videos retrieved successfully");
  }

  @Get(":id/vocabulary")
  @UseGuards(JwtAuthGuard)
  async getLessonVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.lessonService.getLessonVocabulary(lessonId, userId);
    return successResponse(data, "Vocabulary retrieved successfully");
  }

  @Get(":id/homework")
  @UseGuards(JwtAuthGuard)
  async getLessonHomework(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.lessonService.getLessonHomework(lessonId, userId);
    return successResponse(data, "Homework retrieved successfully");
  }

  @Get(":id/quiz")
  @UseGuards(JwtAuthGuard)
  async getLessonQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.lessonService.getLessonQuiz(lessonId, userId);
    return successResponse(data, "Quiz retrieved successfully");
  }
}
