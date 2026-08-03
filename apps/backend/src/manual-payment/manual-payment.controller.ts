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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ManualPaymentService } from "./manual-payment.service";
import { CreateTransferNumberDto, UpdateTransferNumberDto, SubmitOrderDto, ReviewOrderDto } from "./dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("manual-payment")
@UseGuards(JwtAuthGuard)
export class ManualPaymentController {
  constructor(private readonly service: ManualPaymentService) {}

  @Get("transfer-numbers")
  async listActiveNumbers(): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.listTransferNumbers(true);
    return successResponse(data);
  }

  @Get("transfer-numbers/all")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR", "SECRETARY", "SUPPORT")
  async listAllNumbers(): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.listTransferNumbers(false);
    return successResponse(data);
  }

  @Post("transfer-numbers")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  @HttpCode(HttpStatus.CREATED)
  async createNumber(@Body() dto: CreateTransferNumberDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.createTransferNumber(dto);
    return successResponse(data, "Transfer number created");
  }

  @Patch("transfer-numbers/:id")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateNumber(@Param("id") id: string, @Body() dto: UpdateTransferNumberDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.updateTransferNumber(id, dto);
    return successResponse(data, "Transfer number updated");
  }

  @Delete("transfer-numbers/:id")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNumber(@Param("id") id: string): Promise<void> {
    await this.service.deleteTransferNumber(id);
  }

  @Post("orders")
  @HttpCode(HttpStatus.CREATED)
  async submitOrder(
    @CurrentUser() userId: string,
    @Body() dto: SubmitOrderDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.submitOrder(userId, dto);
    return successResponse(data, "Order submitted successfully");
  }

  @Get("orders")
  async listOrders(
    @CurrentUser() userId: string,
    @Query("status") status?: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.listOrders(userId, "STUDENT", status);
    return successResponse(data);
  }

  @Get("orders/my")
  async myOrders(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.listOrders(userId, "STUDENT");
    return successResponse(data);
  }

  @Get("orders/all")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR", "SECRETARY", "SUPPORT")
  async allOrders(@Query("status") status?: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.listOrders("", "ADMIN", status);
    return successResponse(data);
  }

  @Get("orders/:id")
  async getOrder(
    @Param("id") id: string,
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.getOrder(id, userId, "STUDENT");
    return successResponse(data);
  }

  @Post("orders/:id/review")
  @UseGuards(RolesGuard)
  @Roles("ADMINISTRATOR", "SECRETARY", "SUPPORT")
  async reviewOrder(
    @Param("id") id: string,
    @CurrentUser() userId: string,
    @Body() dto: ReviewOrderDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.reviewOrder(id, userId, dto);
    return successResponse(data, `Order ${dto.status.toLowerCase()}`);
  }
}
