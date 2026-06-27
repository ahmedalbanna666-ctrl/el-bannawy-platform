import { Controller, Get, Param, Patch, UseGuards, Body } from "@nestjs/common";
import { CurriculumService } from "./curriculum.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { IsInt, Min } from "class-validator";

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
  async getCurriculum(): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.curriculumService.getCurriculum();
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
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.getLessonProgress(lessonId, userId);
    return successResponse(data, "Lesson progress retrieved successfully");
  }

  @Patch("progress/:lessonId")
  @UseGuards(JwtAuthGuard)
  async updateLessonProgress(
    @Param("lessonId") lessonId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.curriculumService.updateLessonProgress(lessonId, userId, dto.progress);
    return successResponse(data, "Lesson progress updated successfully");
  }
}
