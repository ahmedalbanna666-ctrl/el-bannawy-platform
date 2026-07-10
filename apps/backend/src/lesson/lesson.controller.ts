import { Controller, Get, Post, Delete, Patch, Param, ParseUUIDPipe, UseGuards, Body, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { LessonService } from "./lesson.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateVocabularyDto, UpdateVocabularyDto } from "./dto/vocabulary.dto";

@Controller("lessons")
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get(":id") @UseGuards(JwtAuthGuard)
  async getLesson(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.getLesson(id, userId), "OK");
  }

  @Get(":id/videos") @UseGuards(JwtAuthGuard)
  async getLessonVideos(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.lessonService.getLessonVideos(lessonId, userId), "OK");
  }

  @Get(":id/vocabulary") @UseGuards(JwtAuthGuard)
  async getLessonVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.lessonService.getLessonVocabulary(lessonId, userId), "OK");
  }

  @Get(":id/homework") @UseGuards(JwtAuthGuard)
  async getLessonHomework(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.getLessonHomework(lessonId, userId), "OK");
  }

  @Get(":id/quiz") @UseGuards(JwtAuthGuard)
  async getLessonQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.getLessonQuiz(lessonId, userId), "OK");
  }

  @Post(":id/videos") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async addVideo(@Param("id", ParseUUIDPipe) lessonId: string, @Body("youtubeUrl") youtubeUrl: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.addVideo(lessonId, youtubeUrl, userId), "Video added");
  }

  @Delete(":id/videos/:videoId") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVideo(@Param("id", ParseUUIDPipe) lessonId: string, @Param("videoId", ParseUUIDPipe) videoId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteVideo(lessonId, videoId, userId);
  }

  @Post(":id/vocabulary") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async addVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @Body() dto: CreateVocabularyDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.addVocabulary(lessonId, dto, userId), "Added");
  }

  @Patch(":id/vocabulary/:vocabId") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async updateVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @Param("vocabId", ParseUUIDPipe) vocabId: string, @Body() dto: UpdateVocabularyDto, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.lessonService.updateVocabulary(lessonId, vocabId, dto, userId), "Updated");
  }

  @Delete(":id/vocabulary/:vocabId") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @Param("vocabId", ParseUUIDPipe) vocabId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteVocabulary(lessonId, vocabId, userId);
  }

  @Post(":id/upload/document") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const name = (file?.["originalname"] as string) ?? "document";
    const size = (file?.["size"] as number) ?? 0;
    return successResponse(await this.lessonService.uploadDocument(lessonId, name, name, size, userId), "OK");
  }

  @Delete(":id/document") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteDocument(lessonId, userId);
  }

  @Post(":id/quiz/upload") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file"))
  async uploadQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const name = (file?.["originalname"] as string) ?? "quiz";
    return successResponse(await this.lessonService.uploadQuiz(lessonId, name, userId), "OK");
  }

  @Delete(":id/quiz") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteQuiz(lessonId, userId);
  }

  @Post(":id/homework/upload") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file"))
  async uploadHomework(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const name = (file?.["originalname"] as string) ?? "homework";
    return successResponse(await this.lessonService.uploadHomework(lessonId, name, userId), "OK");
  }

  @Delete(":id/homework") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHomework(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteHomework(lessonId, userId);
  }
}
