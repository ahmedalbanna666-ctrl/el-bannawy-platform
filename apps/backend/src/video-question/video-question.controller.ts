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
import type { IVideoQuestion, IVideoQuestionPublic, IVideoQuestionResult } from "./interfaces";

@Controller("video-questions")
@UseGuards(JwtAuthGuard)
export class VideoQuestionController {
  constructor(private readonly service: VideoQuestionService) {}

  @Get("by-video-event/:videoEventId")
  async getByVideoEventId(@Param("videoEventId") videoEventId: string): Promise<{ data: IVideoQuestionPublic }> {
    const question = await this.service.getByVideoEventId(videoEventId);
    if (!question) throw new NotFoundException("Question not found for this video event");
    return { data: question };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<{ data: IVideoQuestionPublic }> {
    const question = await this.service.getById(id);
    if (!question) throw new NotFoundException("Video question not found");
    return { data: question };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async create(@Body() dto: CreateVideoQuestionDto): Promise<{ data: IVideoQuestion }> {
    const question = await this.service.create(dto);
    return { data: question };
  }

  @Post("with-event")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async createWithEvent(
    @Body() dto: CreateVideoQuestionWithEventDto,
  ): Promise<{ data: { event: unknown; question: IVideoQuestion } }> {
    const result = await this.service.createWithEvent(dto);
    return { data: result };
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async update(@Param("id") id: string, @Body() dto: UpdateVideoQuestionDto): Promise<{ data: IVideoQuestion }> {
    const question = await this.service.update(id, dto);
    return { data: question };
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
  async answer(@Body() dto: AnswerVideoQuestionDto): Promise<{ data: IVideoQuestionResult }> {
    const result = await this.service.answer(dto);
    return { data: result };
  }
}
