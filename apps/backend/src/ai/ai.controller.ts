import { Controller, Get, Post, Delete, Param, ParseUUIDPipe, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SendMessageDto } from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("conversations")
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @CurrentUser() userId: string,
    @Body("title") title?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.createConversation(userId, title);
    return successResponse(data, "Conversation created");
  }

  @Get("conversations")
  @UseGuards(JwtAuthGuard)
  async getConversations(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.getConversations(userId);
    return successResponse(data, "Conversations retrieved");
  }

  @Get("conversations/:conversationId")
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.getConversation(conversationId, userId);
    return successResponse(data, "Conversation retrieved");
  }

  @Delete("conversations/:conversationId")
  @UseGuards(JwtAuthGuard)
  async deleteConversation(
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.deleteConversation(conversationId, userId);
    return successResponse(data, "Conversation deleted");
  }

  @Post("chat")
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.sendMessage(userId, dto);
    return successResponse(data, "Message sent");
  }

  @Get("recommendations")
  @UseGuards(JwtAuthGuard)
  async getRecommendations(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.getRecommendations(userId);
    return successResponse(data, "Recommendations retrieved");
  }
}
