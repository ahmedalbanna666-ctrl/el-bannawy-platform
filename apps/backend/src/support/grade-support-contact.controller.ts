import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { GradeSupportContactService } from "./grade-support-contact.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UpdateGradeSupportContactDto } from "../admin/dto/update-grade-support-contact.dto";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("grade-support")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradeSupportContactController {
  constructor(private readonly service: GradeSupportContactService) {}

  @Get("contacts")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getContacts(
    @CurrentUser() userId: string,
    @Query("gradeId") gradeId?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getContacts(userId, gradeId);
    return successResponse(data);
  }

  @Patch("contacts/:gradeId")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateContact(
    @CurrentUser() userId: string,
    @Param("gradeId", ParseUUIDPipe) gradeId: string,
    @Body() dto: UpdateGradeSupportContactDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.updateContact(userId, gradeId, dto);
    return successResponse(data);
  }
}
