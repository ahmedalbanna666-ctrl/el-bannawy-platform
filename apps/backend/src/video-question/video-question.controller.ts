import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { VideoQuestionService } from "./video-question.service";
import {
  CreateVideoQuestionDto,
  UpdateVideoQuestionDto,
  AnswerVideoQuestionDto,
  CreateVideoQuestionWithEventDto,
} from "./dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import type { IVideoQuestion, IVideoQuestionPublic, IVideoQuestionResult } from "./interfaces";

@Controller("video-questions")
@UseGuards(JwtAuthGuard)
export class VideoQuestionController {
  constructor(private readonly service: VideoQuestionService) {}

  @Get("by-video-event/:videoEventId")
  async getByVideoEventId(@Param("videoEventId") videoEventId: string): Promise<ISuccessResponse<IVideoQuestionPublic>> {
    const question = await this.service.getByVideoEventId(videoEventId);
    if (!question) throw new NotFoundException("Question not found for this video event");
    return successResponse(question, "Video question retrieved");
  }

  @Get("by-video-event/:videoEventId/manage")
  @UseGuards(RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async getByVideoEventIdManage(@Param("videoEventId") videoEventId: string): Promise<ISuccessResponse<IVideoQuestion>> {
    const question = await this.service.getByVideoEventIdFull(videoEventId);
    if (!question) throw new NotFoundException("Question not found for this video event");
    return successResponse(question, "Video question retrieved");
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<ISuccessResponse<IVideoQuestionPublic>> {
    const question = await this.service.getById(id);
    if (!question) throw new NotFoundException("Video question not found");
    return successResponse(question, "Video question retrieved");
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async create(@Body() dto: CreateVideoQuestionDto): Promise<ISuccessResponse<IVideoQuestion>> {
    const question = await this.service.create(dto);
    return successResponse(question, "Video question created");
  }

  @Post("with-event")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createWithEvent(
    @Body() dto: CreateVideoQuestionWithEventDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<{ event: unknown; question: IVideoQuestion }>> {
    const result = await this.service.createWithEvent(dto, userId);
    return successResponse(result, "Video question with event created");
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async update(@Param("id") id: string, @Body() dto: UpdateVideoQuestionDto): Promise<ISuccessResponse<IVideoQuestion>> {
    const question = await this.service.update(id, dto);
    return successResponse(question, "Video question updated");
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async delete(@Param("id") id: string): Promise<void> {
    await this.service.delete(id);
  }

  @Post("answer")
  @HttpCode(HttpStatus.OK)
  async answer(
    @Body() dto: AnswerVideoQuestionDto,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<IVideoQuestionResult>> {
    const result = await this.service.answer(dto, userId);
    return successResponse(result, "Answer submitted");
  }
}
