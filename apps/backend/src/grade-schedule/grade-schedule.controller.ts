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
import { GradeScheduleService } from "./grade-schedule.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateGradeScheduleDto, UpdateGradeScheduleDto } from "./dto";

@Controller("grade-schedules")
@UseGuards(JwtAuthGuard)
export class GradeScheduleController {
  constructor(private readonly service: GradeScheduleService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async create(
    @Body() dto: CreateGradeScheduleDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.create(dto);
    return successResponse(data, "Schedule created successfully");
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async findAll(@CurrentUser() _userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.findAll();
    return successResponse(data);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.findOne(id);
    return successResponse(data);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradeScheduleDto,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.update(id, dto);
    return successResponse(data, "Schedule updated successfully");
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.remove(id);
    return successResponse(data, "Schedule deleted successfully");
  }

  @Get("access/check")
  async checkAccess(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.checkAccess(userId);
    return successResponse(data);
  }

  @Post("notify-today")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async notifyToday(@CurrentUser() _userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.sendTodayNotifications();
    return successResponse(data, "Notifications sent successfully");
  }
}
