import { Controller, Get, Post, Patch, Delete, Param, ParseUUIDPipe, Body, UseGuards, Res } from "@nestjs/common";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { AiService } from "./ai.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { SendMessageDto, CreateFeedbackDto, RegenerateMessageDto } from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("conversations")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
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

  @Get("conversations/favorites")
  @UseGuards(JwtAuthGuard)
  async getFavorites(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.getFavorites(userId);
    return successResponse(data, "Favorites retrieved");
  }

  @Patch("conversations/:conversationId/favorite")
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.toggleFavorite(conversationId, userId);
    return successResponse(data, "Favorite updated");
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async sendMessage(
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.sendMessage(userId, dto);
    return successResponse(data, "Message sent");
  }

  @Post("chat/stream")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async streamMessage(
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.aiService.sendMessageStream(userId, dto);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("meta", {
      messageId: result.messageId,
      conversationId: result.conversationId,
      suggestions: result.suggestions,
      creditsConsumed: result.creditsConsumed,
      sourcesUsed: result.sourcesUsed,
      creditsExhausted: result.creditsExhausted,
      credits: result.credits,
      walletBalance: result.walletBalance,
    });

    try {
      let full = "";
      for await (const chunk of result.stream) {
        full += chunk;
        send("delta", { text: chunk });
      }
      send("done", { full, messageId: result.messageId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send("error", { message });
    } finally {
      res.end();
    }
  }

  @Post("messages/:messageId/feedback")
  @UseGuards(JwtAuthGuard)
  async submitFeedback(
    @CurrentUser() userId: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Body() dto: CreateFeedbackDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.submitFeedback(userId, messageId, dto);
    return successResponse(data, "Feedback submitted");
  }

  @Post("regenerate")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async regenerateMessage(
    @CurrentUser() userId: string,
    @Body() dto: RegenerateMessageDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.aiService.regenerateMessage(userId, dto);
    return successResponse(data, "Message regenerated");
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
