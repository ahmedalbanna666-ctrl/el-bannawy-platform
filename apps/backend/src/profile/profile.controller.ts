import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.profileService.getProfile(userId);
    return successResponse(data, "Profile retrieved successfully");
  }

  @Patch()
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.profileService.updateProfile(userId, dto);
    return successResponse(data, "Profile updated successfully");
  }
}
