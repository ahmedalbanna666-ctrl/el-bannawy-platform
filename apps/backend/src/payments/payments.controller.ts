import { Controller, Get, Post, Patch, Delete, Param, ParseUUIDPipe, Body, UseGuards } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CheckoutDto, VerifyPaymentDto, CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from "./dto/payment.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("methods")
  @UseGuards(JwtAuthGuard)
  getMethods(): ISuccessResponse<unknown> {
    const data = this.paymentsService.getPaymentMethods();
    return successResponse(data, "Payment methods retrieved");
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  async checkout(
    @CurrentUser() userId: string,
    @Body() dto: CheckoutDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.checkout(userId, dto);
    return successResponse(data, "Checkout created successfully");
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @CurrentUser() userId: string,
    @Body() dto: VerifyPaymentDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.verifyPayment(dto.checkoutId, dto);
    return successResponse(data, "Payment verified");
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getHistory(userId);
    return successResponse(data, "Payment history retrieved");
  }

  @Get(":paymentId")
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param("paymentId", ParseUUIDPipe) paymentId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getPayment(paymentId);
    return successResponse(data, "Payment details retrieved");
  }

  @Get("invoices/all")
  @UseGuards(JwtAuthGuard)
  async getInvoices(
    @CurrentUser() userId: string,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getInvoices(userId);
    return successResponse(data, "Invoices retrieved");
  }

  @Get("invoices/:invoiceId")
  @UseGuards(JwtAuthGuard)
  async getInvoice(@Param("invoiceId", ParseUUIDPipe) invoiceId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getInvoice(invoiceId);
    return successResponse(data, "Invoice retrieved");
  }

  @Post(":paymentId/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async refundPayment(@Param("paymentId", ParseUUIDPipe) paymentId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.refundPayment(paymentId);
    return successResponse(data, "Refund processed");
  }

  @Get("refunds/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getRefunds(): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getRefunds();
    return successResponse(data, "Refunds retrieved");
  }

  // --- Coupons ---

  @Post("coupons/validate")
  @UseGuards(JwtAuthGuard)
  async validateCoupon(@Body() dto: ValidateCouponDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.validateCoupon(dto);
    return successResponse(data, "Coupon validated");
  }

  @Get("coupons/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async listCoupons(): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.listCoupons();
    return successResponse(data, "Coupons retrieved");
  }

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async createCoupon(@Body() dto: CreateCouponDto): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.createCoupon(dto);
    return successResponse(data, "Coupon created");
  }

  @Patch("coupons/:couponId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateCoupon(
    @Param("couponId", ParseUUIDPipe) couponId: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.updateCoupon(couponId, dto);
    return successResponse(data, "Coupon updated");
  }

  @Delete("coupons/:couponId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async deleteCoupon(@Param("couponId", ParseUUIDPipe) couponId: string): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.deleteCoupon(couponId);
    return successResponse(data, "Coupon deleted");
  }

  // --- Admin ---

  @Get("transactions/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getTransactions(): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getTransactions();
    return successResponse(data, "Transactions retrieved");
  }

  @Get("analytics/data")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMINISTRATOR")
  async getAnalytics(): Promise<ISuccessResponse<unknown>> {
    const data = await this.paymentsService.getAnalytics();
    return successResponse(data, "Payment analytics retrieved");
  }
}
