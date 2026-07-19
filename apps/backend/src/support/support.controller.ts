import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SupportService } from "./support.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("support")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get("tickets")
  async listTickets(
    @CurrentUser() userId: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("category") category?: string,
    @Query("assignedAgentId") assignedAgentId?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.support.listTickets(userId, { status, priority, category, assignedAgentId });
    return successResponse(data);
  }

  @Get("tickets/:ticketId")
  async getTicket(
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.support.getTicket(ticketId, userId);
    return successResponse(data);
  }

  @Post("tickets")
  async createTicket(
    @CurrentUser() userId: string,
    @Body() dto: { subject: string; description: string; category?: string; priority?: string },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.support.createTicket(userId, dto);
    return successResponse(data, "Ticket created successfully");
  }

  @Post("tickets/:ticketId/messages")
  async addMessage(
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @CurrentUser() userId: string,
    @Body() dto: { body: string; internal?: boolean },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.support.addMessage(ticketId, userId, dto);
    return successResponse(data, "Message added");
  }

  @Patch("tickets/:ticketId")
  async updateTicket(
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @CurrentUser() userId: string,
    @Body() dto: { status?: string; priority?: string; assignedAgentId?: string | null },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.support.updateTicket(ticketId, userId, dto);
    return successResponse(data, "Ticket updated");
  }

  @Post("tickets/:ticketId/resolve")
  @Roles("ADMINISTRATOR", "SUPPORT", "STAFF")
  async resolveTicket(
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @CurrentUser() userId: string,
    @Body() dto: { resolution: string },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.support.resolveTicket(ticketId, userId, dto);
    return successResponse(data, "Ticket resolved");
  }

  @Post("tickets/:ticketId/close")
  async closeTicket(
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
  ): Promise<ISuccessResponse<null>> {
    await this.support.closeTicket(ticketId);
    return successResponse(null, "Ticket closed");
  }
}
