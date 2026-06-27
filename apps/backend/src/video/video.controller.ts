import { Controller, Get, Param, Patch, Post, UseGuards, Body } from "@nestjs/common";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { UpdateVideoProgressDto } from "./dto/update-video-progress.dto";

@Controller("videos")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getVideo(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.getVideo(id);
    return successResponse(data, "Video retrieved successfully");
  }

  @Get(":id/progress")
  @UseGuards(JwtAuthGuard)
  async getVideoProgress(@Param("id") id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.getVideoProgress(id, userId);
    return successResponse(data, "Video progress retrieved successfully");
  }

  @Patch(":id/progress")
  @UseGuards(JwtAuthGuard)
  async updateProgress(
    @Param("id") id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateVideoProgressDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.updateProgress(id, userId, dto.currentPosition, dto.watchedSeconds);
    return successResponse(data, "Video progress updated successfully");
  }

  @Post(":id/complete")
  @UseGuards(JwtAuthGuard)
  async completeVideo(@Param("id") id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.completeVideo(id, userId);
    return successResponse(data, "Video completed successfully");
  }

  @Get(":id/resume")
  @UseGuards(JwtAuthGuard)
  async getResumeData(@Param("id") id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.getResumeData(id, userId);
    return successResponse(data, "Resume data retrieved successfully");
  }

  @Get(":id/timeline-events")
  @UseGuards(JwtAuthGuard)
  async getTimelineEvents(@Param("id") id: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.videoService.getTimelineEvents(id);
    return successResponse(data, "Timeline events retrieved successfully");
  }

  @Post("timeline-events/:eventId/complete")
  @UseGuards(JwtAuthGuard)
  async completeTimelineEvent(
    @Param("eventId") eventId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.videoService.completeTimelineEvent(eventId, userId);
    return successResponse(data, "Timeline event completed successfully");
  }
}
