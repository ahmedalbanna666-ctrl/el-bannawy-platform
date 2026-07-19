import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { MistakesService } from "./mistakes.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MistakeQueryDto } from "./dto/mistake-query.dto";
import { CreateMiniExamDto } from "./dto/create-mini-exam.dto";
import { SubmitMiniExamDto } from "./dto/submit-mini-exam.dto";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("mistakes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MistakesController {
  constructor(private readonly service: MistakesService) {}

  @Get()
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getWrongAnswers(
    @CurrentUser() userId: string,
    @Query() params: MistakeQueryDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getWrongAnswers(userId, params);
    return successResponse(data);
  }

  @Get("filters")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getFilters(
    @CurrentUser() userId: string,
    @Query("studentId") studentId?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getFilters(userId, studentId);
    return successResponse(data);
  }

  @Post("mini-exam")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  @HttpCode(HttpStatus.CREATED)
  async createMiniExam(
    @CurrentUser() userId: string,
    @Body() dto: CreateMiniExamDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.createMiniExam(userId, dto);
    return successResponse(data);
  }

  @Get("mini-exam/history")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getMiniExamHistory(
    @CurrentUser() userId: string,
    @Query("studentId") studentId?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getMiniExamHistory(userId, studentId);
    return successResponse(data);
  }

  @Get("mini-exam/:id")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  async getMiniExam(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) examId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getMiniExam(examId, userId);
    return successResponse(data);
  }

  @Post("mini-exam/:id/submit")
  @Roles("ADMINISTRATOR", "TEACHER", "STUDENT")
  @HttpCode(HttpStatus.OK)
  async submitMiniExam(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) examId: string,
    @Body() dto: SubmitMiniExamDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.submitMiniExam(examId, userId, dto);
    return successResponse(data);
  }
}
