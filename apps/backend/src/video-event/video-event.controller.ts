import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { VideoEventService } from "./video-event.service";
import { VideoEventDispatcherService } from "./dispatcher/video-event-dispatcher.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateVideoEventDto } from "./dto/create-video-event.dto";
import { UpdateVideoEventDto } from "./dto/update-video-event.dto";
import type { VideoEventPayload } from "./interfaces/video-event-handler.interface";

@Controller("video-events")
export class VideoEventController {
  constructor(
    private readonly videoEventService: VideoEventService,
    private readonly dispatcher: VideoEventDispatcherService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async create(@Body() dto: CreateVideoEventDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.videoEventService.create(dto), "Video event created");
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByVideoId(
    @Query("videoId") videoId: string,
    @Query("type") type?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    if (type) {
      return successResponse(await this.videoEventService.findByVideoIdAndType(videoId, type), "Video events retrieved");
    }
    return successResponse(await this.videoEventService.findByVideoId(videoId), "Video events retrieved");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.videoEventService.findById(id), "Video event retrieved");
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVideoEventDto,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.videoEventService.update(id, dto), "Video event updated");
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.videoEventService.remove(id);
  }

  @Post(":id/dispatch")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async dispatch(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _userId: string,
  ): Promise<ISuccessResponse<{ dispatched: boolean }>> {
    const event = (await this.videoEventService.findById(id)) as VideoEventPayload;
    await this.dispatcher.dispatch(event);
    return successResponse({ dispatched: true }, "Event dispatched");
  }

  @Post("reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() body: { ids: string[] }): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.videoEventService.reorder(body.ids), "Video events reordered");
  }
}
