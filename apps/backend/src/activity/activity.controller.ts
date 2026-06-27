import { Controller, Get, Param, Post, UseGuards, Body } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SubmitActivityDto } from "./dto/submit-activity.dto";

@Controller("activities")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getActivity(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.activityService.getActivity(id);
    return successResponse(data, "Activity retrieved successfully");
  }

  @Post(":id/start")
  @UseGuards(JwtAuthGuard)
  async startActivity(@Param("id") id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.activityService.startActivity(id, userId);
    return successResponse(data, "Activity started successfully");
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard)
  async submitActivity(
    @Param("id") id: string,
    @CurrentUser() userId: string,
    @Body() dto: SubmitActivityDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.activityService.submitActivity(id, userId, dto.response, dto.answers, dto.score);
    return successResponse(data, "Activity submitted successfully");
  }

  @Get(":id/progress")
  @UseGuards(JwtAuthGuard)
  async getActivityProgress(@Param("id") id: string, @CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.activityService.getActivityProgress(id, userId);
    return successResponse(data, "Activity progress retrieved successfully");
  }
}
