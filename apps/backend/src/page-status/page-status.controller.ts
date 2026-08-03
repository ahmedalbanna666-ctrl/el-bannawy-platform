import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { PageStatusService } from "./page-status.service";
import { PageStatusEntryDto } from "./dto/page-status-entry.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("page-status")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PageStatusController {
  constructor(private readonly service: PageStatusService) {}

  @Get()
  @Roles("ADMINISTRATOR", "TEACHER", "STAFF", "SECRETARY", "STUDENT", "SUPPORT")
  async getStatus(
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getStatus();
    return successResponse(data);
  }

  @Patch("global")
  @Roles("ADMINISTRATOR")
  async updateGlobal(
    @Body() dto: PageStatusEntryDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.updateGlobal(dto);
    return successResponse(data, "Global status updated");
  }

  @Patch("pages/:pageKey")
  @Roles("ADMINISTRATOR")
  async updatePage(
    @Param("pageKey") pageKey: string,
    @Body() dto: PageStatusEntryDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.updatePage(pageKey, dto);
    return successResponse(data, "Page status updated");
  }
}
