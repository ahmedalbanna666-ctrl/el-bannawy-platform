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
import { CoinsService } from "./coins.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("coins")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoinsController {
  constructor(private readonly coins: CoinsService) {}

  @Get("packages")
  async listPackages(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listPackages(userId);
    return successResponse(data);
  }

  @Get("packages/all")
  @Roles("ADMINISTRATOR")
  async listAllPackages(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listPackages(userId);
    return successResponse(data);
  }

  @Post("packages")
  @Roles("ADMINISTRATOR")
  async createPackage(
    @Body() dto: { name: string; description?: string; coinAmount: number; price: number },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.createPackage(dto);
    return successResponse(data, "Package created");
  }

  @Patch("packages/:id")
  @Roles("ADMINISTRATOR")
  async updatePackage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Partial<{ name: string; description: string; coinAmount: number; price: number; active: boolean }>,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.updatePackage(id, dto);
    return successResponse(data, "Package updated");
  }

  @Delete("packages/:id")
  @Roles("ADMINISTRATOR")
  async deletePackage(@Param("id", ParseUUIDPipe) id: string): Promise<ISuccessResponse<null>> {
    await this.coins.deletePackage(id);
    return successResponse(null, "Package deleted");
  }

  @Get("wallet")
  async getWallet(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.getWallet(userId);
    return successResponse(data);
  }

  @Post("purchase")
  async purchase(
    @CurrentUser() userId: string,
    @Body() dto: { packageId: string; paymentMethod: string },
  ): Promise<ISuccessResponse<{ checkoutId: string; paymentUrl: string; amount: number; paymentId: string }>> {
    const data = await this.coins.purchasePackage(userId, dto);
    return successResponse(data, "Checkout created");
  }

  @Post("verify")
  async verify(
    @CurrentUser() userId: string,
    @Body() dto: { checkoutId: string; paymentMethod?: string; gatewayRef?: string; rawPayload?: Record<string, unknown> },
  ): Promise<ISuccessResponse<{ verified: boolean; status: string; coinsAdded: number }>> {
    const data = await this.coins.verifyPurchase(userId, dto);
    return successResponse(data, "Purchase verified");
  }

  @Post("redeem")
  async redeem(
    @CurrentUser() userId: string,
    @Body() dto: { code: string },
  ): Promise<ISuccessResponse<{ coinsAdded: number }>> {
    const data = await this.coins.redeemCode(userId, dto.code);
    return successResponse(data, "Code redeemed");
  }

  @Get("codes")
  @Roles("ADMINISTRATOR")
  async listCodes(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listCodes(userId);
    return successResponse(data);
  }

  @Post("codes")
  @Roles("ADMINISTRATOR")
  async createCode(
    @CurrentUser() userId: string,
    @Body() dto: { code?: string; coinAmount: number; maxUses?: number; expiresAt?: string },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.createCode(userId, dto);
    return successResponse(data, "Code created");
  }

  @Post("codes/:id/toggle")
  @Roles("ADMINISTRATOR")
  async toggleCode(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.toggleCode(userId, id);
    return successResponse(data, "Code updated");
  }

  @Get("requests")
  async listRequests(
    @CurrentUser() userId: string,
    @Query("status") status?: string,
  ): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listRequests(userId, status);
    return successResponse(data);
  }

  @Post("requests")
  async submitRequest(
    @CurrentUser() userId: string,
    @Body() dto: { targetType: string; targetId: string },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.submitRequest(userId, dto);
    return successResponse(data, "Request submitted");
  }

  @Post("requests/:id/resolve")
  @Roles("ADMINISTRATOR")
  async resolveRequest(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: { status: string; adminNote?: string },
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.coins.resolveRequest(userId, id, dto);
    return successResponse(data, "Request resolved");
  }

  @Post("unlock")
  async unlockContent(
    @CurrentUser() userId: string,
    @Body() dto: { targetType: string; targetId: string },
  ): Promise<ISuccessResponse<{ unlocked: boolean }>> {
    const data = await this.coins.unlockContent(userId, dto);
    return successResponse(data, "Content unlocked");
  }

  @Get("access/:targetType/:targetId")
  async checkAccess(
    @CurrentUser() userId: string,
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
  ): Promise<ISuccessResponse<{ unlocked: boolean; hasProgress: boolean }>> {
    const data = await this.coins.checkAccess(userId, targetType, targetId);
    return successResponse(data);
  }

  @Get("my-purchases")
  async myPurchases(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listMyPurchases(userId);
    return successResponse(data);
  }

  @Get("my-unlocks")
  async myUnlocks(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    const data = await this.coins.listMyUnlocks(userId);
    return successResponse(data);
  }
}
