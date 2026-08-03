import { Controller, Get, Post, Delete, Patch, Param, ParseUUIDPipe, UseGuards, Body, UseInterceptors, UploadedFile, HttpCode, HttpStatus, ForbiddenException, Res } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { LessonService } from "./lesson.service";
import { GradeScheduleService } from "../grade-schedule/grade-schedule.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateVocabularyDto, UpdateVocabularyDto, CommitVocabularyImportDto } from "./dto/vocabulary.dto";
import { CommitQuestionImportDto } from "./dto/question-import.dto";
import { validateUploadedFile, sanitizeFilename, utf8FilenameInterceptorOptions } from "../common/validators/file.validator";
import type { VocabularyStructuredDraft } from "../document-import/types/vocabulary-structured.types";
import type { QuestionImportPreview } from "../document-import/types/question-preview.types";

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

@Controller("lessons")
export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly gradeSchedule: GradeScheduleService,
  ) {}

  private async enforceScheduleAccess(userId: string): Promise<void> {
    const access = await this.gradeSchedule.checkAccess(userId);
    if (!access.allowed) {
      throw new ForbiddenException(access.message);
    }
  }

  @Get(":id") @UseGuards(JwtAuthGuard)
  async getLesson(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    await this.enforceScheduleAccess(userId);
    return successResponse(await this.lessonService.getLesson(id, userId), "OK");
  }

  @Get(":id/videos") @UseGuards(JwtAuthGuard)
  async getLessonVideos(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    await this.enforceScheduleAccess(userId);
    return successResponse(await this.lessonService.getLessonVideos(lessonId, userId), "OK");
  }

  @Get(":id/vocabulary") @UseGuards(JwtAuthGuard)
  async getLessonVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    await this.enforceScheduleAccess(userId);
    return successResponse(await this.lessonService.getLessonVocabulary(lessonId, userId), "OK");
  }

  @Get(":id/homework") @UseGuards(JwtAuthGuard)
  async getLessonHomework(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    await this.enforceScheduleAccess(userId);
    return successResponse(await this.lessonService.getLessonHomework(lessonId, userId), "OK");
  }

  @Get(":id/quiz") @UseGuards(JwtAuthGuard)
  async getLessonQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    await this.enforceScheduleAccess(userId);
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

  @Delete(":id/vocabulary") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async deleteAllVocabulary(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<{ deletedCount: number }>> {
    return successResponse(
      await this.lessonService.deleteAllVocabulary(lessonId, userId),
      "All vocabulary deleted",
    );
  }

  @Post(":id/vocabulary/import/preview") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async previewVocabularyImport(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Record<string, unknown>,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<VocabularyStructuredDraft>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, {
      allowedMimes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    const safeName = sanitizeFilename(f.originalname ?? "unknown.docx");
    return successResponse(
      await this.lessonService.previewVocabularyImport(lessonId, f.buffer!, safeName, userId),
      "Preview generated",
    );
  }

  @Post(":id/vocabulary/import/commit") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async commitVocabularyImport(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @Body() dto: CommitVocabularyImportDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(
      await this.lessonService.commitVocabularyImport(lessonId, dto, userId),
      "Vocabulary imported",
    );
  }

  @Post(":id/questions/import/preview") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async previewQuestionImport(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Record<string, unknown>,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<QuestionImportPreview>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, {
      allowedMimes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    const safeName = sanitizeFilename(f.originalname ?? "unknown.docx");
    return successResponse(
      await this.lessonService.previewQuestionImport(lessonId, f.buffer!, safeName, userId),
      "Preview generated",
    );
  }

  @Post(":id/questions/import/commit") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async commitQuestionImport(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @Body() dto: CommitQuestionImportDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(
      await this.lessonService.commitQuestionImport(lessonId, dto, userId),
      "Questions imported",
    );
  }

  @Post(":id/upload/document") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async uploadDocument(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, { allowedMimes: ALLOWED_DOCUMENT_MIMES });
    const safeName = sanitizeFilename(f.originalname ?? "document");
    return successResponse(
      await this.lessonService.uploadDocument(lessonId, safeName, f.buffer!, f.size ?? 0, f.mimetype ?? "", userId),
      "Document uploaded",
    );
  }

  @Get(":id/document") @UseGuards(JwtAuthGuard)
  async getDocument(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @CurrentUser() userId: string,
    @Res() res: Record<string, unknown>,
  ): Promise<void> {
    const doc = await this.lessonService.getDocument(lessonId, userId);
    (res as { setHeader: (k: string, v: string) => void }).setHeader("Content-Type", doc.mimeType);
    (res as { setHeader: (k: string, v: string) => void }).setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    );
    (res as { end: (b: Buffer) => void }).end(doc.buffer);
  }

  @Patch(":id/document/downloadable") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async setDocumentDownloadable(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @Body("downloadable") downloadable: boolean,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(
      await this.lessonService.setDocumentDownloadable(lessonId, downloadable, userId),
      "Document availability updated",
    );
  }

  @Delete(":id/document") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteDocument(lessonId, userId);
  }

  @Post(":id/quiz/upload") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async uploadQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, {
      allowedMimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    const safeName = sanitizeFilename(f.originalname ?? "quiz");
    return successResponse(await this.lessonService.uploadQuiz(lessonId, safeName, f.buffer!, f.size ?? 0, userId), "Quiz uploaded");
  }

  @Delete(":id/quiz") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuiz(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteQuiz(lessonId, userId);
  }

  @Post(":id/homework/upload") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async uploadHomework(@Param("id", ParseUUIDPipe) lessonId: string, @UploadedFile() file: Record<string, unknown>, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, {
      allowedMimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    const safeName = sanitizeFilename(f.originalname ?? "homework");
    return successResponse(await this.lessonService.uploadHomework(lessonId, safeName, f.buffer!, f.size ?? 0, userId), "Homework uploaded");
  }

  @Delete(":id/homework") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR") @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHomework(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<void> {
    await this.lessonService.deleteHomework(lessonId, userId);
  }

  @Get(":id/games") @UseGuards(JwtAuthGuard)
  async getLessonGames(@Param("id", ParseUUIDPipe) lessonId: string, @CurrentUser() userId: string): Promise<ISuccessResponse<Record<string, { enabled: boolean }>>> {
    return successResponse(await this.lessonService.getLessonGames(lessonId, userId), "OK");
  }

  @Patch(":id/games") @UseGuards(JwtAuthGuard, RolesGuard) @Roles("TEACHER", "ADMINISTRATOR")
  async updateLessonGames(
    @Param("id", ParseUUIDPipe) lessonId: string,
    @Body() dto: Record<string, { enabled: boolean }>,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<Record<string, { enabled: boolean }>>> {
    return successResponse(await this.lessonService.updateLessonGames(lessonId, dto, userId), "Games updated");
  }
}
