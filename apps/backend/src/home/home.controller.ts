import { Controller, Get, UseGuards } from "@nestjs/common";
import { HomeService } from "./home.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse } from "../common/helpers/response.helper";

@Controller("home")
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getDashboard(@CurrentUser() userId: string): Promise<ReturnType<typeof successResponse>> {
    const data = await this.homeService.getDashboard(userId);
    return successResponse(data, "Dashboard data retrieved successfully");
  }
}
