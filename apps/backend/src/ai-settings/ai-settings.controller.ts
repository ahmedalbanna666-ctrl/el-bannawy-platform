import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AiSettingsService } from "./ai-settings.service";
import {
  CreateTeachingStyleDto,
  UpdateTeachingStyleDto,
  CreateModelConfigDto,
  UpdateModelConfigDto,
  CreateCreditPlanDto,
  UpdateCreditPlanDto,
  CreatePackageDto,
  UpdatePackageDto,
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  PreviewPromptDto,
  TestPromptDto,
  UsageLogQueryDto,
  ModerationLogQueryDto,
  AnalyticsQueryDto,
  AddCreditsDto,
  BuyCreditsDto,
} from "./dto/ai-settings.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("ai-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiSettingsController {
  constructor(private readonly service: AiSettingsService) {}

  // ---------- Teaching styles ----------

  @Post("teaching-styles")
  @Roles("ADMINISTRATOR")
  async createTeachingStyle(@Body() dto: CreateTeachingStyleDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createTeachingStyle(dto), "Teaching style created");
  }

  @Get("teaching-styles")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getTeachingStyles(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getTeachingStyles());
  }

  @Get("teaching-styles/active")
  async getActiveTeachingStyle(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getActiveTeachingStyle());
  }

  @Patch("teaching-styles/:id")
  @Roles("ADMINISTRATOR")
  async updateTeachingStyle(@Param("id") id: string, @Body() dto: UpdateTeachingStyleDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updateTeachingStyle(id, dto), "Teaching style updated");
  }

  @Delete("teaching-styles/:id")
  @Roles("ADMINISTRATOR")
  async deleteTeachingStyle(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.deleteTeachingStyle(id);
    return successResponse(null, "Teaching style deleted");
  }

  // ---------- Model configs / providers ----------

  @Post("model-configs")
  @Roles("ADMINISTRATOR")
  async createModelConfig(@Body() dto: CreateModelConfigDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createModelConfig(dto), "Model config created");
  }

  @Get("model-configs")
  @Roles("ADMINISTRATOR")
  async getModelConfigs(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getModelConfigs());
  }

  @Patch("model-configs/:id")
  @Roles("ADMINISTRATOR")
  async updateModelConfig(@Param("id") id: string, @Body() dto: UpdateModelConfigDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updateModelConfig(id, dto), "Model config updated");
  }

  @Delete("model-configs/:id")
  @Roles("ADMINISTRATOR")
  async deleteModelConfig(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.deleteModelConfig(id);
    return successResponse(null, "Model config deleted");
  }

  @Post("providers/:id/health")
  @Roles("ADMINISTRATOR")
  async probeProviderHealth(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.probeProviderHealth(id), "Provider health probe completed");
  }

  @Post("providers/health")
  @Roles("ADMINISTRATOR")
  async probeAllProvidersHealth(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.probeAllProvidersHealth(), "Provider health checks completed");
  }

  // ---------- Credit plans ----------

  @Post("credit-plans")
  @Roles("ADMINISTRATOR")
  async createCreditPlan(@Body() dto: CreateCreditPlanDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createCreditPlan(dto), "Credit plan created");
  }

  @Get("credit-plans")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getCreditPlans(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getCreditPlans());
  }

  @Patch("credit-plans/:id")
  @Roles("ADMINISTRATOR")
  async updateCreditPlan(@Param("id") id: string, @Body() dto: UpdateCreditPlanDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updateCreditPlan(id, dto), "Credit plan updated");
  }

  @Delete("credit-plans/:id")
  @Roles("ADMINISTRATOR")
  async deleteCreditPlan(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.deleteCreditPlan(id);
    return successResponse(null, "Credit plan deleted");
  }

  // ---------- Packages ----------

  @Post("packages")
  @Roles("ADMINISTRATOR")
  async createPackage(@Body() dto: CreatePackageDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createPackage(dto), "Package created");
  }

  @Get("packages")
  async getPackages(@Query("includeInactive") includeInactive?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getPackages(includeInactive === "true"));
  }

  @Patch("packages/:id")
  @Roles("ADMINISTRATOR")
  async updatePackage(@Param("id") id: string, @Body() dto: UpdatePackageDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updatePackage(id, dto), "Package updated");
  }

  @Delete("packages/:id")
  @Roles("ADMINISTRATOR")
  async deletePackage(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.deletePackage(id);
    return successResponse(null, "Package deleted");
  }

  @Post("packages/:packageId/assign/:userId")
  @Roles("ADMINISTRATOR")
  async assignPackage(@Param("packageId") packageId: string, @Param("userId") userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.assignPackage(userId, packageId), "Package assigned");
  }

  // ---------- Prompt templates ----------

  @Post("prompt-templates")
  @Roles("ADMINISTRATOR")
  async createPromptTemplate(@Body() dto: CreatePromptTemplateDto, @CurrentUser() userId?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.createPromptTemplate(dto, userId), "Prompt template created");
  }

  @Get("prompt-templates")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getPromptTemplates(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getPromptTemplates());
  }

  @Get("prompt-templates/active")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getActivePromptTemplate(@Query("key") key?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getActivePromptTemplate(key));
  }

  @Get("prompt-templates/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getPromptTemplate(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getPromptTemplate(id));
  }

  @Patch("prompt-templates/:id")
  @Roles("ADMINISTRATOR")
  async updatePromptTemplate(@Param("id") id: string, @Body() dto: UpdatePromptTemplateDto, @CurrentUser() userId?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.updatePromptTemplate(id, dto, userId), "Prompt template updated");
  }

  @Delete("prompt-templates/:id")
  @Roles("ADMINISTRATOR")
  async deletePromptTemplate(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    await this.service.deletePromptTemplate(id);
    return successResponse(null, "Prompt template deleted");
  }

  @Post("prompt-templates/:id/rollback")
  @Roles("ADMINISTRATOR")
  async rollbackPromptTemplate(@Param("id") id: string, @Query("version") version: string, @CurrentUser() userId?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.rollbackPromptTemplate(id, Number(version), userId), "Prompt template rolled back");
  }

  @Post("prompt-templates/preview")
  @Roles("ADMINISTRATOR", "TEACHER")
  async previewPrompt(@Body() dto: PreviewPromptDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.previewPrompt(dto));
  }

  @Post("prompt-templates/test")
  @Roles("ADMINISTRATOR", "TEACHER")
  async testPrompt(@Body() dto: TestPromptDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.testPrompt(dto), "Prompt test completed");
  }

  // ---------- Credits ----------

  @Get("credits/my")
  async getMyCredits(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getStudentCredits(userId));
  }

  @Get("credits/check")
  async checkCredits(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.checkCredits(userId));
  }

  @Get("credits/history")
  async getCreditHistory(@CurrentUser() userId: string, @Query("page") page?: string, @Query("limit") limit?: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getCreditHistory(userId, Number(page ?? 1), Number(limit ?? 50)));
  }

  @Post("credits/add")
  @Roles("ADMINISTRATOR")
  async addCredits(@Body() dto: AddCreditsDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.addCredits(dto.userId, dto.amount, dto.reason), "Credits added");
  }

  @Post("credits/buy")
  async buyCredits(@CurrentUser() userId: string, @Body() dto: BuyCreditsDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.buyCreditsWithCoins(userId, dto.amount), "Credits purchased");
  }

  // ---------- Usage logs ----------

  @Get("usage-logs")
  @Roles("ADMINISTRATOR")
  async getUsageLogs(@Query() query: UsageLogQueryDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getUsageLogs(query));
  }

  @Get("usage-stats")
  @Roles("ADMINISTRATOR")
  async getUsageStats(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getUsageStats());
  }

  // ---------- Moderation logs ----------

  @Get("moderation-logs")
  @Roles("ADMINISTRATOR")
  async getModerationLogs(@Query() query: ModerationLogQueryDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getModerationLogs(query));
  }

  // ---------- Analytics ----------

  @Get("analytics")
  @Roles("ADMINISTRATOR")
  async getAnalytics(@Query() query: AnalyticsQueryDto): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getAnalytics(query.range ?? "month"));
  }

  // ---------- Health ----------

  @Get("health")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getHealthOverview(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getHealthOverview());
  }
}
