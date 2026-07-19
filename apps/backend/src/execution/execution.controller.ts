import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ExecutionService } from "./execution.service";
import { ExecutePluginDto } from "./dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { ExecutionResult } from "./interfaces";

@Controller("execution")
@UseGuards(JwtAuthGuard)
export class ExecutionController {
  constructor(private readonly service: ExecutionService) {}

  @Post("execute")
  @HttpCode(HttpStatus.OK)
  async execute(@Body() dto: ExecutePluginDto, @CurrentUser() userId: string): Promise<{ data: ExecutionResult }> {
    const result = await this.service.execute({
      videoId: dto.videoId,
      eventId: dto.eventId,
      pluginType: dto.pluginType,
      userId,
      currentTime: dto.currentTime,
      playbackState: dto.playbackState,
      eventPayload: dto.eventPayload ?? {},
      metadata: dto.metadata ?? {},
    });
    return { data: result };
  }
}
