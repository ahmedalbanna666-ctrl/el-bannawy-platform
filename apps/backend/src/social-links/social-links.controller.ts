import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SocialLinksService, type CreateSocialLinkDto, type UpdateSocialLinkDto } from "./social-links.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("social-links")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SocialLinksController {
  constructor(private readonly service: SocialLinksService) {}

  @Get()
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getAll(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getAll());
  }

  @Get("active")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getActive(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getActive());
  }

  @Post()
  @Roles("ADMINISTRATOR")
  async create(@Body() dto: CreateSocialLinkDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.create(dto), "Social link created");
  }

  @Patch(":id")
  @Roles("ADMINISTRATOR")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSocialLinkDto,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.update(id, dto), "Social link updated");
  }

  @Delete(":id")
  @Roles("ADMINISTRATOR")
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.remove(id);
    return successResponse(null, "Social link deleted");
  }
}
