import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CreateCampaignDto, UpdateCampaignDto, UpdateReferralStatusDto } from "./dto/referral.dto";

@Controller("referrals")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralController {
  constructor(private readonly referrals: ReferralService) {}

  // ── Student endpoints ────────────────────────────────────────────────

  @Get("overview")
  async getMyOverview(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.getMyOverview(userId);
    return successResponse(data);
  }

  @Get("popup")
  async getPopup(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.getPopup(userId);
    return successResponse(data);
  }

  @Post("popup/:campaignId/view")
  async recordPopupView(
    @CurrentUser() userId: string,
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.recordPopupView(userId, campaignId);
    return successResponse(data);
  }

  // ── Admin: campaigns ─────────────────────────────────────────────────

  @Get("campaigns")
  @Roles("ADMINISTRATOR")
  async listCampaigns(): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.listCampaigns();
    return successResponse(data);
  }

  @Post("campaigns")
  @Roles("ADMINISTRATOR")
  async createCampaign(
    @CurrentUser() userId: string,
    @Body() dto: CreateCampaignDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.createCampaign(userId, dto);
    return successResponse(data, "Campaign created");
  }

  @Patch("campaigns/:id")
  @Roles("ADMINISTRATOR")
  async updateCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.updateCampaign(id, dto);
    return successResponse(data, "Campaign updated");
  }

  @Delete("campaigns/:id")
  @Roles("ADMINISTRATOR")
  async deleteCampaign(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.deleteCampaign(id);
    return successResponse(data, "Campaign deleted");
  }

  // ── Admin: referrals ─────────────────────────────────────────────────

  @Get("list")
  @Roles("ADMINISTRATOR")
  async listReferrals(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.listReferrals(status, Number(page) || 1, Number(limit) || 20);
    return successResponse(data);
  }

  @Get("stats")
  @Roles("ADMINISTRATOR")
  async getStats(): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.getReferralStats();
    return successResponse(data);
  }

  @Patch("list/:id/status")
  @Roles("ADMINISTRATOR")
  async updateReferralStatus(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralStatusDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.referrals.updateReferralStatus(userId, id, dto.status);
    return successResponse(data, `Referral ${dto.status.toLowerCase()}`);
  }
}
