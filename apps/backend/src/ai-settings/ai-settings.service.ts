import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/services/encryption.service";
import { CacheService } from "../common/services/cache.service";
import { AiProviderService } from "./providers/ai-provider.service";
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
} from "./dto/ai-settings.dto";

type PrismaJson = Prisma.InputJsonValue;

type StudentCreditsWithRelations = Prisma.StudentAiCreditsGetPayload<{
  include: { plan: true; package: true };
}>;

type TeachingStyle = Prisma.AiTeachingStyleGetPayload<Record<string, never>>;

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly providerService: AiProviderService,
    private readonly cache: CacheService,
  ) {}

  // ---------- Teaching styles ----------

  async createTeachingStyle(dto: CreateTeachingStyleDto): Promise<unknown> {
    const existingActive = await this.prisma.aiTeachingStyle.findFirst({ where: { isActive: true } });
    const isActive = dto.isActive ?? !existingActive;

    if (isActive && existingActive) {
      await this.prisma.aiTeachingStyle.update({ where: { id: existingActive.id }, data: { isActive: false } });
    }

    const created = await this.prisma.aiTeachingStyle.create({
      data: {
        name: dto.name,
        content: dto.content,
        greetingStyle: dto.greetingStyle,
        explanationStyle: dto.explanationStyle,
        encouragementPhrases: dto.encouragementPhrases,
        correctionStyle: dto.correctionStyle,
        difficultyLevel: dto.difficultyLevel ?? "INTERMEDIATE",
        arabicUsage: dto.arabicUsage ?? "BALANCED",
        englishUsage: dto.englishUsage ?? "BALANCED",
        emojiPolicy: dto.emojiPolicy ?? "MODERATE",
        examplesPolicy: dto.examplesPolicy ?? "ALWAYS",
        hintsPolicy: dto.hintsPolicy ?? "SCAFFOLDED",
        responseLength: dto.responseLength ?? "MEDIUM",
        isActive,
      },
    });
    await this.invalidateTeachingStyleCache();
    return created;
  }

  async updateTeachingStyle(id: string, dto: UpdateTeachingStyleDto): Promise<unknown> {
    const style = await this.prisma.aiTeachingStyle.findFirst({ where: { id } });
    if (!style) throw new NotFoundException("Teaching style not found");

    if (dto.isActive === true) {
      await this.prisma.aiTeachingStyle.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }

    const updated = await this.prisma.aiTeachingStyle.update({ where: { id }, data: dto as never });
    await this.invalidateTeachingStyleCache();
    return updated;
  }

  async deleteTeachingStyle(id: string): Promise<unknown> {
    const style = await this.prisma.aiTeachingStyle.findFirst({ where: { id } });
    if (!style) throw new NotFoundException("Teaching style not found");
    const deleted = await this.prisma.aiTeachingStyle.delete({ where: { id } });
    await this.invalidateTeachingStyleCache();
    return deleted;
  }

  async getTeachingStyles(): Promise<unknown> {
    return this.prisma.aiTeachingStyle.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getActiveTeachingStyle(): Promise<TeachingStyle | null> {
    const cacheKey = "ai:teaching-style:active";
    const cached = await this.cache.get<TeachingStyle>(cacheKey);
    if (cached) return cached;
    const style = await this.prisma.aiTeachingStyle.findFirst({ where: { isActive: true } });
    if (style) {
      await this.cache.set(cacheKey, style, 300);
    }
    return style;
  }

  private async invalidateTeachingStyleCache(): Promise<void> {
    await this.cache.del("ai:teaching-style:active");
  }

  // ---------- Providers (model configs) ----------

  async createModelConfig(dto: CreateModelConfigDto): Promise<unknown> {
    if (dto.isActive) {
      await this.prisma.aiModelConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    const encryptedApiKey = dto.apiKey ? this.encryption.encrypt(dto.apiKey) : null;
    const created = await this.prisma.aiModelConfig.create({
      data: {
        provider: dto.provider,
        modelName: dto.modelName,
        apiKey: encryptedApiKey ?? "",
        baseUrl: dto.baseUrl,
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 2000,
        timeout: dto.timeout ?? 30,
        isActive: dto.isActive ?? false,
        isEnabled: dto.isEnabled ?? true,
        priority: dto.priority ?? 0,
        supportsStreaming: dto.supportsStreaming ?? true,
      },
    });
    return this.toSafeModelConfig(created);
  }

  async updateModelConfig(id: string, dto: UpdateModelConfigDto): Promise<unknown> {
    const config = await this.prisma.aiModelConfig.findFirst({ where: { id } });
    if (!config) throw new NotFoundException("Model config not found");

    if (dto.isActive === true) {
      await this.prisma.aiModelConfig.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }

    const updateData: Record<string, unknown> = {
      provider: dto.provider,
      modelName: dto.modelName,
      baseUrl: dto.baseUrl,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      timeout: dto.timeout,
      isActive: dto.isActive,
      isEnabled: dto.isEnabled,
      priority: dto.priority,
      supportsStreaming: dto.supportsStreaming,
    };
    if (dto.apiKey) {
      updateData.apiKey = this.encryption.encrypt(dto.apiKey);
    }

    const updated = await this.prisma.aiModelConfig.update({ where: { id }, data: updateData as never });
    return this.toSafeModelConfig(updated);
  }

  async deleteModelConfig(id: string): Promise<unknown> {
    const config = await this.prisma.aiModelConfig.findFirst({ where: { id } });
    if (!config) throw new NotFoundException("Model config not found");
    const deleted = await this.prisma.aiModelConfig.delete({ where: { id } });
    return this.toSafeModelConfig(deleted);
  }

  async getModelConfigs(): Promise<unknown> {
    const configs = await this.prisma.aiModelConfig.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
    return configs.map((c) => this.toSafeModelConfig(c));
  }

  async getActiveModelConfig(): Promise<{ apiKey: string; modelName: string; provider: string; baseUrl: string | null; maxTokens: number; temperature: number; timeout: number } | null> {
    const config = await this.prisma.aiModelConfig.findFirst({ where: { isActive: true, isEnabled: true } });
    if (!config) return null;
    return {
      ...config,
      apiKey: config.apiKey ? this.encryption.decrypt(config.apiKey) : "",
    };
  }

  private toSafeModelConfig(config: {
    apiKey: string;
    [key: string]: unknown;
  }): Record<string, unknown> {
    const safe: Record<string, unknown> = { ...config };
    delete safe.apiKey;
    safe.apiKey = config.apiKey ? this.encryption.mask(config.apiKey) : "";
    return safe;
  }

  async probeProviderHealth(configId: string): Promise<unknown> {
    const result = await this.providerService.probeHealth(configId);
    return result;
  }

  async probeAllProvidersHealth(): Promise<unknown> {
    const configs = await this.prisma.aiModelConfig.findMany({ where: { isEnabled: true } });
    const results = [];
    for (const config of configs) {
      results.push({
        configId: config.id,
        provider: config.provider,
        modelName: config.modelName,
        ...(await this.providerService.probeHealth(config.id)),
      });
    }
    return results;
  }

  // ---------- Credit plans ----------

  async createCreditPlan(dto: CreateCreditPlanDto): Promise<unknown> {
    return this.prisma.aiCreditPlan.create({ data: dto as never });
  }

  async updateCreditPlan(id: string, dto: UpdateCreditPlanDto): Promise<unknown> {
    const plan = await this.prisma.aiCreditPlan.findFirst({ where: { id } });
    if (!plan) throw new NotFoundException("Credit plan not found");
    return this.prisma.aiCreditPlan.update({ where: { id }, data: dto as never });
  }

  async deleteCreditPlan(id: string): Promise<unknown> {
    const plan = await this.prisma.aiCreditPlan.findFirst({ where: { id } });
    if (!plan) throw new NotFoundException("Credit plan not found");
    return this.prisma.aiCreditPlan.delete({ where: { id } });
  }

  async getCreditPlans(): Promise<unknown> {
    return this.prisma.aiCreditPlan.findMany({ orderBy: { createdAt: "asc" } });
  }

  // ---------- Packages ----------

  async createPackage(dto: CreatePackageDto): Promise<unknown> {
    return this.prisma.aiPackage.create({
      data: {
        name: dto.name,
        description: dto.description,
        planType: dto.planType ?? "FREE",
        price: dto.price ?? 0,
        currency: dto.currency ?? "EGP",
        creditsPerQuestion: dto.creditsPerQuestion ?? 1,
        creditsPerSession: dto.creditsPerSession ?? 10,
        freeCredits: dto.freeCredits ?? 20,
        resetPeriod: dto.resetPeriod ?? "DAILY",
        dailyLimit: dto.dailyLimit,
        weeklyLimit: dto.weeklyLimit,
        monthlyLimit: dto.monthlyLimit,
        isUnlimited: dto.isUnlimited ?? false,
        features: dto.features as PrismaJson | undefined,
        modelAccess: dto.modelAccess as PrismaJson | undefined,
        priority: dto.priority ?? 0,
        restrictions: dto.restrictions as PrismaJson | undefined,
        isActive: dto.isActive ?? true,
        creditPlanId: dto.creditPlanId,
      },
    });
  }

  async updatePackage(id: string, dto: UpdatePackageDto): Promise<unknown> {
    const pkg = await this.prisma.aiPackage.findFirst({ where: { id } });
    if (!pkg) throw new NotFoundException("Package not found");
    return this.prisma.aiPackage.update({ where: { id }, data: dto as never });
  }

  async deletePackage(id: string): Promise<unknown> {
    const pkg = await this.prisma.aiPackage.findFirst({ where: { id } });
    if (!pkg) throw new NotFoundException("Package not found");
    return this.prisma.aiPackage.delete({ where: { id } });
  }

  async getPackages(includeInactive = false): Promise<unknown> {
    return this.prisma.aiPackage.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { creditPlan: true },
    });
  }

  async assignPackage(userId: string, packageId: string): Promise<unknown> {
    const pkg = await this.prisma.aiPackage.findFirst({ where: { id: packageId, isActive: true } });
    if (!pkg) throw new NotFoundException("Package not found");

    let planId = pkg.creditPlanId;
    if (!planId) {
      const plan = await this.prisma.aiCreditPlan.findFirst({ where: { isActive: true } });
      if (!plan) throw new BadRequestException("No credit plan linked to this package");
      planId = plan.id;
    }

    const now = new Date();
    const existing = await this.prisma.studentAiCredits.findFirst({ where: { userId } });
    if (existing) {
      return this.prisma.studentAiCredits.update({
        where: { id: existing.id },
        data: {
          planId,
          packageId,
          creditsLimit: pkg.isUnlimited ? pkg.freeCredits : pkg.freeCredits,
          creditsUsed: 0,
          lastResetAt: now,
          nextResetAt: this.calculateNextReset(now, pkg.resetPeriod),
        },
        include: { plan: true, package: true },
      });
    }

    return this.prisma.studentAiCredits.create({
      data: {
        userId,
        planId,
        packageId,
        creditsLimit: pkg.freeCredits,
        lastResetAt: now,
        nextResetAt: this.calculateNextReset(now, pkg.resetPeriod),
      },
      include: { plan: true, package: true },
    });
  }

  // ---------- Prompt templates ----------

  async createPromptTemplate(dto: CreatePromptTemplateDto, userId?: string): Promise<unknown> {
    const existing = await this.prisma.aiPromptTemplate.findFirst({ where: { key: dto.key } });
    if (existing) throw new BadRequestException("Prompt template key already exists");

    if (dto.isActive) {
      await this.prisma.aiPromptTemplate.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }

    const template = await this.prisma.aiPromptTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        variables: dto.variables,
        isSystem: dto.isSystem ?? false,
        isActive: dto.isActive ?? false,
        version: 1,
        createdById: userId,
      },
    });

    await this.prisma.aiPromptVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        systemPrompt: dto.systemPrompt,
        variables: dto.variables,
        createdById: userId,
      },
    });

    return template;
  }

  async updatePromptTemplate(id: string, dto: UpdatePromptTemplateDto, userId?: string): Promise<unknown> {
    const template = await this.prisma.aiPromptTemplate.findFirst({ where: { id } });
    if (!template) throw new NotFoundException("Prompt template not found");

    if (dto.isActive === true) {
      await this.prisma.aiPromptTemplate.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }

    const nextVersion = template.version + 1;
    const newSystemPrompt = dto.systemPrompt ?? template.systemPrompt;
    const newVariables = (dto.variables ?? template.variables) as PrismaJson | null;

    const updated = await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: newSystemPrompt,
        variables: newVariables ?? Prisma.DbNull,
        isSystem: dto.isSystem,
        isActive: dto.isActive,
        version: dto.systemPrompt ? nextVersion : template.version,
      },
    });

    if (dto.systemPrompt) {
      await this.prisma.aiPromptVersion.create({
        data: {
          templateId: id,
          version: nextVersion,
          systemPrompt: newSystemPrompt,
          variables: newVariables ?? Prisma.DbNull,
          createdById: userId,
        },
      });
    }

    return updated;
  }

  async deletePromptTemplate(id: string): Promise<unknown> {
    const template = await this.prisma.aiPromptTemplate.findFirst({ where: { id } });
    if (!template) throw new NotFoundException("Prompt template not found");
    if (template.isSystem) throw new BadRequestException("System prompt templates cannot be deleted");
    return this.prisma.aiPromptTemplate.delete({ where: { id } });
  }

  async getPromptTemplates(): Promise<unknown> {
    return this.prisma.aiPromptTemplate.findMany({
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }],
      include: { versions: { orderBy: { version: "desc" } } },
    });
  }

  async getPromptTemplate(id: string): Promise<unknown> {
    const template = await this.prisma.aiPromptTemplate.findFirst({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
    if (!template) throw new NotFoundException("Prompt template not found");
    return template;
  }

  async getActivePromptTemplate(key?: string): Promise<unknown> {
    return this.prisma.aiPromptTemplate.findFirst({
      where: key ? { key, isActive: true } : { isActive: true },
    });
  }

  async rollbackPromptTemplate(id: string, version: number, userId?: string): Promise<unknown> {
    const versionRow = await this.prisma.aiPromptVersion.findFirst({
      where: { templateId: id, version },
    });
    if (!versionRow) throw new NotFoundException("Prompt version not found");

    const template = await this.prisma.aiPromptTemplate.findFirst({ where: { id } });
    if (!template) throw new NotFoundException("Prompt template not found");

    const nextVersion = template.version + 1;
    const updated = await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { systemPrompt: versionRow.systemPrompt, version: nextVersion },
    });

    await this.prisma.aiPromptVersion.create({
      data: {
        templateId: id,
        version: nextVersion,
        systemPrompt: versionRow.systemPrompt,
        variables: versionRow.variables as PrismaJson | undefined,
        createdById: userId,
      },
    });

    return updated;
  }

  previewPrompt(dto: PreviewPromptDto): Promise<unknown> {
    const rendered = this.renderPrompt(dto.systemPrompt, dto.variables);
    return Promise.resolve({ rendered });
  }

  async testPrompt(dto: TestPromptDto): Promise<unknown> {
    const rendered = this.renderPrompt(dto.systemPrompt, dto.variables);
    let result: { content: string | null; provider: string } = { content: null, provider: "rule-based" };

    if (dto.providerId) {
      const providerResult = await this.providerService.chat(
        [
          { role: "system", content: rendered },
          { role: "user", content: dto.message ?? "Hello, please introduce yourself briefly." },
        ],
        { maxTokens: 200 },
      );
      if (providerResult) {
        result = { content: providerResult.content, provider: providerResult.provider };
      }
    }

    return { rendered, result };
  }

  private renderPrompt(template: string, variables?: Record<string, string>): string {
    let rendered = template;
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value);
      }
    }
    return rendered;
  }

  // ---------- Credits ----------

  private async ensureDefaultCreditPlan(): Promise<{ id: string }> {
    const existing = await this.prisma.aiCreditPlan.findFirst();
    if (existing) return { id: existing.id };

    return this.prisma.aiCreditPlan.create({
      data: {
        name: "Free Plan",
        creditsPerQuestion: 1,
        creditsPerSession: 10,
        freeCredits: 20,
        resetPeriod: "DAILY",
        isUnlimited: false,
        isActive: true,
      },
      select: { id: true },
    });
  }

  async getStudentCredits(userId: string): Promise<StudentCreditsWithRelations | null> {
    let credits = await this.prisma.studentAiCredits.findFirst({
      where: { userId },
      include: { plan: true, package: true },
    });

    if (!credits) {
      const defaultPlan = await this.prisma.aiCreditPlan.findFirst({ where: { isActive: true } });
      const planId = defaultPlan?.id ?? (await this.prisma.aiCreditPlan.findFirst())?.id ?? (await this.ensureDefaultCreditPlan()).id;
      credits = await this.prisma.studentAiCredits.create({
        data: { userId, planId },
        include: { plan: true, package: true },
      });
    }

    await this.checkAndResetCredits(credits);

    return this.prisma.studentAiCredits.findFirst({
      where: { userId },
      include: { plan: true, package: true },
    });
  }

  async checkCredits(userId: string): Promise<{ allowed: boolean; remaining: number; plan: string; total: number; unlimited: boolean }> {
    const credits = await this.getStudentCredits(userId);
    if (!credits) throw new BadRequestException("No credit plan assigned");

    if (credits.plan.isUnlimited) {
      return { allowed: true, remaining: -1, plan: credits.plan.name, total: credits.creditsLimit, unlimited: true };
    }

    const remaining = credits.creditsLimit - credits.creditsUsed;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      plan: credits.plan.name,
      total: credits.creditsLimit,
      unlimited: false,
    };
  }

  async consumeCredits(userId: string, amount = 1): Promise<void> {
    const credits = await this.getStudentCredits(userId);
    if (!credits) throw new BadRequestException("No credits available");

    if (credits.plan.isUnlimited) return;

    const remaining = credits.creditsLimit - credits.creditsUsed;
    if (remaining < amount) {
      throw new BadRequestException("Insufficient AI credits");
    }

    await this.prisma.studentAiCredits.update({
      where: { id: credits.id },
      data: { creditsUsed: { increment: amount } },
    });

    await this.prisma.aiUsageLog.create({
      data: {
        userId,
        question: "credit-consumption",
        response: `Consumed ${String(amount)} credit(s)`,
        creditsConsumed: amount,
        success: true,
      },
    });
  }

  async addCredits(userId: string, amount: number, _reason?: string): Promise<unknown> {
    const credits = await this.prisma.studentAiCredits.findFirst({ where: { userId } });
    if (!credits) throw new NotFoundException("Student credits record not found");

    return this.prisma.studentAiCredits.update({
      where: { id: credits.id },
      data: { creditsLimit: { increment: amount } },
    });
  }

  async buyCreditsWithCoins(userId: string, amount: number): Promise<unknown> {
    const credits = await this.getStudentCredits(userId);
    if (!credits) throw new BadRequestException("No credit plan assigned");

    const wallet = await this.prisma.coinWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });

    if (wallet.balance < amount) {
      throw new BadRequestException("Insufficient coins");
    }

    const updated = await this.prisma.$transaction([
      this.prisma.coinWallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.studentAiCredits.update({
        where: { id: credits.id },
        data: { creditsLimit: { increment: amount } },
      }),
    ]);

    await this.prisma.aiUsageLog.create({
      data: {
        userId,
        question: "credit-purchase-with-coins",
        response: `Purchased ${String(amount)} credit(s) with coins`,
        creditsConsumed: 0,
        success: true,
      },
    });

    const check = await this.checkCredits(userId);
    return {
      creditsAdded: amount,
      coinsSpent: amount,
      walletBalance: updated[0].balance,
      credits: check,
    };
  }

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.coinWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });
    return wallet.balance;
  }

  async getCreditHistory(userId: string, page = 1, limit = 50): Promise<unknown> {
    const where = { userId };
    const [logs, total] = await Promise.all([
      this.prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          question: true,
          creditsConsumed: true,
          success: true,
          createdAt: true,
        },
      }),
      this.prisma.aiUsageLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }

  // ---------- Usage logs ----------

  async getUsageLogs(options?: { userId?: string; page?: number; limit?: number; startDate?: string; endDate?: string; success?: boolean }): Promise<unknown> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (options?.userId) where.userId = options.userId;
    if (options?.success !== undefined) where.success = options.success;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
      if (options.endDate) (where.createdAt as Record<string, Date>).lte = new Date(options.endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.aiUsageLog.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.aiUsageLog.count({ where: where as never }),
    ]);

    return { logs, total, page, limit };
  }

  async logUsage(data: {
    userId: string;
    conversationId?: string;
    question: string;
    response?: string;
    sourcesUsed?: unknown;
    creditsConsumed?: number;
    responseTime?: number;
    modelUsed?: string;
    provider?: string;
    success?: boolean;
    errorMessage?: string;
    errorCode?: string;
    tokensIn?: number;
    tokensOut?: number;
    tokensTotal?: number;
    embeddingTokens?: number;
    cachedTokens?: number;
    cachedReadTokens?: number;
    cachedWriteTokens?: number;
    requestCost?: number | null;
    responseCost?: number | null;
    embeddingCost?: number | null;
    cacheCost?: number | null;
    totalCost?: number | null;
    currency?: string;
    streamed?: boolean;
  }): Promise<unknown> {
    return this.prisma.aiUsageLog.create({ data: data as never });
  }

  // ---------- Moderation logs ----------

  async logModeration(data: { userId?: string; action: string; reason?: string; inputSnippet?: string; provider?: string }): Promise<unknown> {
    return this.prisma.aiModerationLog.create({ data });
  }

  async getModerationLogs(options?: { action?: string; page?: number; limit?: number }): Promise<unknown> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (options?.action) where.action = options.action;

    const [logs, total] = await Promise.all([
      this.prisma.aiModerationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiModerationLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  // ---------- Analytics ----------

  async getUsageStats(): Promise<unknown> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, monthCount, totalLogs, avgResponse, topUsers, totalCredits, topQuestions, errorCount, providerUsage, costTotals, tokenTotals, todayCost] =
      await Promise.all([
        this.prisma.aiUsageLog.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.aiUsageLog.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.aiUsageLog.count({ where: { createdAt: { gte: monthAgo } } }),
        this.prisma.aiUsageLog.count(),
        this.prisma.aiUsageLog.aggregate({ _avg: { responseTime: true } }),
        this.prisma.aiUsageLog.groupBy({
          by: ["userId"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        this.prisma.aiUsageLog.aggregate({ _sum: { creditsConsumed: true } }),
        this.prisma.aiUsageLog.groupBy({
          by: ["question"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        this.prisma.aiUsageLog.count({ where: { success: false } }),
        this.prisma.aiUsageLog.groupBy({
          by: ["provider"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        this.prisma.aiUsageLog.aggregate({ _sum: { totalCost: true, requestCost: true, responseCost: true, embeddingCost: true, cacheCost: true } }),
        this.prisma.aiUsageLog.aggregate({ _sum: { tokensIn: true, tokensOut: true, tokensTotal: true, embeddingTokens: true, cachedTokens: true } }),
        this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { totalCost: true, creditsConsumed: true } }),
      ]);

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      total: totalLogs,
      errors: errorCount,
      totalCredits: totalCredits._sum.creditsConsumed ?? 0,
      avgResponseTime: avgResponse._avg.responseTime ?? 0,
      topUsers,
      topQuestions,
      providerUsage,
      cost: {
        totalCost: costTotals._sum.totalCost ?? 0,
        requestCost: costTotals._sum.requestCost ?? 0,
        responseCost: costTotals._sum.responseCost ?? 0,
        embeddingCost: costTotals._sum.embeddingCost ?? 0,
        cacheCost: costTotals._sum.cacheCost ?? 0,
        todayCost: todayCost._sum.totalCost ?? 0,
      },
      tokens: {
        tokensIn: tokenTotals._sum.tokensIn ?? 0,
        tokensOut: tokenTotals._sum.tokensOut ?? 0,
        tokensTotal: tokenTotals._sum.tokensTotal ?? 0,
        embeddingTokens: tokenTotals._sum.embeddingTokens ?? 0,
        cachedTokens: tokenTotals._sum.cachedTokens ?? 0,
      },
    };
  }

  async getAnalytics(range: "day" | "week" | "month" | "year" = "month"): Promise<unknown> {
    const now = new Date();
    const startMap: Record<string, Date> = {
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const since = startMap[range] ?? startMap.month;

    const [total, errors, users, credits, avgLatency, models, topQuestions, sources, costTotals, tokenTotals] = await Promise.all([
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: since }, success: false } }),
      this.prisma.aiUsageLog.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: since } }, _sum: { creditsConsumed: true } }),
      this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: since } }, _avg: { responseTime: true } }),
      this.prisma.aiUsageLog.groupBy({ by: ["modelUsed"], where: { createdAt: { gte: since } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      this.prisma.aiUsageLog.groupBy({ by: ["question"], where: { createdAt: { gte: since } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
      this.prisma.aiUsageLog.findMany({
        where: { createdAt: { gte: since }, sourcesUsed: { not: Prisma.DbNull } },
        select: { sourcesUsed: true },
        take: 500,
      }),
      this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: since } }, _sum: { totalCost: true, requestCost: true, responseCost: true, embeddingCost: true, cacheCost: true } }),
      this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: since } }, _sum: { tokensIn: true, tokensOut: true, tokensTotal: true, embeddingTokens: true, cachedTokens: true } }),
    ]);

    const sourceUsage: Record<string, number> = {};
    for (const row of sources) {
      const parsed = row.sourcesUsed as unknown;
      if (Array.isArray(parsed)) {
        for (const s of parsed as { sourceId?: string; sourceTitle?: string }[]) {
          const key = s.sourceTitle ?? s.sourceId ?? "unknown";
          sourceUsage[key] = (sourceUsage[key] ?? 0) + 1;
        }
      }
    }
    const topSources = Object.entries(sourceUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }));

    const dailySeries: { date: string; count: number }[] = [];
    if (range === "year") {
      const months = 12;
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const count = await this.prisma.aiUsageLog.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } });
        dailySeries.push({ date: monthStart.toISOString().slice(0, 7), count });
      }
    } else {
      const days = range === "day" ? 24 : range === "week" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const count = await this.prisma.aiUsageLog.count({ where: { createdAt: { gte: start, lt: end } } });
        dailySeries.push({ date: start.toISOString().slice(0, 10), count });
      }
    }

    return {
      range,
      since: since.toISOString(),
      requests: total,
      errors,
      uniqueUsers: users.length,
      creditsUsed: credits._sum.creditsConsumed ?? 0,
      avgLatency: avgLatency._avg.responseTime ?? 0,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      models: models.map((m) => ({ model: m.modelUsed ?? "unknown", count: m._count.id })),
      topQuestions: topQuestions.map((q) => ({ question: q.question, count: q._count.id })),
      topSources,
      dailySeries,
      cost: {
        totalCost: costTotals._sum.totalCost ?? 0,
        requestCost: costTotals._sum.requestCost ?? 0,
        responseCost: costTotals._sum.responseCost ?? 0,
        embeddingCost: costTotals._sum.embeddingCost ?? 0,
        cacheCost: costTotals._sum.cacheCost ?? 0,
      },
      tokens: {
        tokensIn: tokenTotals._sum.tokensIn ?? 0,
        tokensOut: tokenTotals._sum.tokensOut ?? 0,
        tokensTotal: tokenTotals._sum.tokensTotal ?? 0,
        embeddingTokens: tokenTotals._sum.embeddingTokens ?? 0,
        cachedTokens: tokenTotals._sum.cachedTokens ?? 0,
      },
    };
  }

  // ---------- Health ----------

  async getHealthOverview(): Promise<unknown> {
    const [providers, activeProvider, sources, indexedSources, chunks, activePrompt] = await Promise.all([
      this.prisma.aiModelConfig.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
      this.prisma.aiModelConfig.findFirst({ where: { isActive: true, isEnabled: true } }),
      this.prisma.aiKnowledgeSource.count({ where: { deletedAt: null } }),
      this.prisma.aiKnowledgeSource.count({ where: { status: "INDEXED", deletedAt: null } }),
      this.prisma.aiKnowledgeChunk.count(),
      this.prisma.aiPromptTemplate.findFirst({ where: { isActive: true } }),
    ]);

    return {
      providers: providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        modelName: p.modelName,
        isActive: p.isActive,
        isEnabled: p.isEnabled,
        priority: p.priority,
        healthStatus: p.healthStatus,
        lastHealthCheckAt: p.lastHealthCheckAt,
        lastError: p.lastError,
      })),
      activeProvider: activeProvider
        ? {
            id: activeProvider.id,
            provider: activeProvider.provider,
            modelName: activeProvider.modelName,
            baseUrl: activeProvider.baseUrl,
            isActive: activeProvider.isActive,
            isEnabled: activeProvider.isEnabled,
            priority: activeProvider.priority,
            supportsStreaming: activeProvider.supportsStreaming,
            healthStatus: activeProvider.healthStatus,
          }
        : null,
      knowledgeBase: {
        totalSources: sources,
        indexedSources,
        totalChunks: chunks,
        coverage: sources > 0 ? Math.round((indexedSources / sources) * 100) : 0,
      },
      activePrompt: activePrompt ? { key: activePrompt.key, name: activePrompt.name, version: activePrompt.version } : null,
      status: "OPERATIONAL",
    };
  }

  // ---------- Reset logic ----------

  async checkAndResetCredits(credits: {
    id: string;
    lastResetAt: Date;
    nextResetAt: Date | null;
    creditsLimit: number;
    creditsUsed: number;
    plan: { resetPeriod: string; freeCredits: number; isUnlimited: boolean; dailyLimit: number | null; weeklyLimit: number | null; monthlyLimit: number | null };
  }): Promise<void> {
    if (credits.plan.isUnlimited) return;
    if (!credits.nextResetAt) return;
    if (new Date() < credits.nextResetAt) return;

    const limit = credits.plan.freeCredits;
    const now = new Date();
    const nextReset = this.calculateNextReset(now, credits.plan.resetPeriod);

    await this.prisma.studentAiCredits.update({
      where: { id: credits.id },
      data: { creditsUsed: 0, creditsLimit: limit, lastResetAt: now, nextResetAt: nextReset },
    });
  }

  calculateNextReset(from: Date, period: string): Date {
    const next = new Date(from);
    if (period === "DAILY") next.setDate(next.getDate() + 1);
    else if (period === "WEEKLY") next.setDate(next.getDate() + 7);
    else if (period === "MONTHLY") next.setMonth(next.getMonth() + 1);
    return next;
  }
}
