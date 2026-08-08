import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LivePricingPlanTypeEnum } from "@el-bannawy/shared";
import type { $Enums } from "@prisma/client";

export interface LivePricingPlanRow {
  id: string;
  code: string;
  name: string;
  short: string;
  description: string;
  type: $Enums.LivePricingPlanType;
  price: number;
  sessionCount: number;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface CreateLivePricingPlanInput {
  code: string;
  name: string;
  short: string;
  description: string;
  type: LivePricingPlanTypeEnum;
  price: number;
  sessionCount: number;
  benefits?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * LiveProductPricingService — source of truth for live plans.
 *
 * Plans live in the `LivePricingPlan` table (admin-managed CRUD). The six
 * legacy products are seeded automatically when the table is empty, applying
 * any admin-customized prices previously stored in the SystemSetting key
 * `live_product_prices`. Only ADMINISTRATOR may mutate plans.
 */
@Injectable()
export class LiveProductPricingService implements OnModuleInit {
  private readonly logger = new Logger(LiveProductPricingService.name);

  private static readonly LEGACY_SETTING_KEY = "live_product_prices";

  private static readonly DEFAULT_PLANS: readonly CreateLivePricingPlanInput[] = [
    {
      code: "PRIVATE_PLAN_A",
      name: "خطة A فردية",
      short: "حصتان شهرياً",
      description: "جلسة خاصة ثابتة أسبوعياً مع معلمك الخاص.",
      type: LivePricingPlanTypeEnum.PRIVATE,
      price: 500,
      sessionCount: 4,
      benefits: ["حصة خاصة أسبوعية ثابتة", "متابعة مستمرة مع نفس المعلم", "تقرير تقدم شهري"],
      sortOrder: 1,
    },
    {
      code: "PRIVATE_PLAN_B",
      name: "خطة B فردية",
      short: "4 حصص شهرياً",
      description: "جلسات خاصة مرتين أسبوعياً لمتابعة أسرع.",
      type: LivePricingPlanTypeEnum.PRIVATE,
      price: 800,
      sessionCount: 8,
      benefits: ["حصتان خاصتان أسبوعياً", "متابعة مستمرة مع نفس المعلم", "تقرير تقدم شهري"],
      sortOrder: 2,
    },
    {
      code: "GROUP_PLAN_A",
      name: "خطة A مجموعة",
      short: "حصتان شهرياً",
      description: "حصص مجموعة ثابتة أسبوعياً مع زملائك.",
      type: LivePricingPlanTypeEnum.GROUP,
      price: 300,
      sessionCount: 4,
      benefits: ["حصة مجموعة أسبوعية ثابتة", "تفاعل مع زملائك", "متابعة دورية للمستوى"],
      sortOrder: 3,
    },
    {
      code: "GROUP_PLAN_B",
      name: "خطة B مجموعة",
      short: "4 حصص شهرياً",
      description: "حصص مجموعة مرتين أسبوعياً لتعميق الاستيعاب.",
      type: LivePricingPlanTypeEnum.GROUP,
      price: 400,
      sessionCount: 8,
      benefits: ["حصص مجموعة مرتين أسبوعياً", "تفاعل مع زملائك", "متابعة دورية للمستوى"],
      sortOrder: 4,
    },
    {
      code: "ONE_TIME",
      name: "حصة منفردة",
      short: "حصة واحدة",
      description: "حجز حصة خاصة حسب المواعيد المتاحة.",
      type: LivePricingPlanTypeEnum.ONE_TIME,
      price: 200,
      sessionCount: 1,
      benefits: ["حصة خاصة واحدة", "اختيار الموعد المناسب"],
      sortOrder: 5,
    },
    {
      code: "FREE",
      name: "فعالية مجانية",
      short: "مجانية",
      description: "انضم لجلسات مباشرة مجانية دورية.",
      type: LivePricingPlanTypeEnum.FREE,
      price: 0,
      sessionCount: 0,
      benefits: ["جلسات مباشرة مجانية", "لا يتطلب اشتراكاً"],
      sortOrder: 6,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultsIfEmpty();
  }

  /** Seed the six legacy plans when the table is empty (bootstrap fallback). */
  private async seedDefaultsIfEmpty(): Promise<void> {
    const count = await this.prisma.livePricingPlan.count();
    if (count > 0) return;

    const legacyPrices: Record<string, number> = {};
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: LiveProductPricingService.LEGACY_SETTING_KEY },
      });
      if (setting) {
        const parsed = JSON.parse(setting.value) as Record<string, number>;
        for (const [code, price] of Object.entries(parsed)) {
          if (typeof price === "number" && price >= 0) legacyPrices[code] = price;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Invalid ${LiveProductPricingService.LEGACY_SETTING_KEY} payload, ignoring: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    await this.prisma.$transaction(
      LiveProductPricingService.DEFAULT_PLANS.map((plan) =>
        this.prisma.livePricingPlan.create({
          data: {
            ...plan,
            price: legacyPrices[plan.code] ?? plan.price,
            isActive: true,
          },
        }),
      ),
    );
    this.logger.log("Seeded default live pricing plans");
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  async getPlans(activeOnly = false): Promise<LivePricingPlanRow[]> {
    await this.seedDefaultsIfEmpty();
    return this.prisma.livePricingPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async getPlanByCode(code: string): Promise<LivePricingPlanRow> {
    await this.seedDefaultsIfEmpty();
    const plan = await this.prisma.livePricingPlan.findUnique({ where: { code } });
    if (!plan?.isActive) {
      throw new NotFoundException(`Live plan not found or inactive: ${code}`);
    }
    return plan;
  }

  /** Price map keyed by code (kept for backward compatibility with the old pricing endpoint). */
  async getPrices(): Promise<Record<string, number>> {
    const plans = await this.getPlans();
    return Object.fromEntries(plans.map((p) => [p.code, p.price]));
  }

  async getPrice(code: string): Promise<number> {
    const plan = await this.getPlanByCode(code);
    return plan.price;
  }

  async getSessionCount(code: string): Promise<number> {
    const plan = await this.getPlanByCode(code);
    return plan.sessionCount;
  }

  /** Syntactically extract a plan code from a `LIVE_*` product type. */
  static codeFromProductType(productType: string): string {
    if (!productType) throw new BadRequestException("Product type is required");
    if (!productType.toUpperCase().startsWith("LIVE_")) {
      throw new BadRequestException(`Unsupported live product type: ${productType}`);
    }
    const code = productType.slice("LIVE_".length);
    if (code.length === 0) throw new BadRequestException("Invalid live product type");
    return code;
  }

  // ── Admin writes ─────────────────────────────────────────────────────────

  private assertAdmin(role: string): void {
    if (role !== "ADMINISTRATOR") {
      throw new ForbiddenException("Only administrators can manage live pricing plans");
    }
  }

  async createPlan(userId: string, role: string, dto: CreateLivePricingPlanInput): Promise<LivePricingPlanRow> {
    this.assertAdmin(role);
    void userId;
    const existing = await this.prisma.livePricingPlan.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Live plan already exists: ${dto.code}`);
    }
    return this.prisma.livePricingPlan.create({
      data: {
        code: dto.code,
        name: dto.name,
        short: dto.short,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        sessionCount: dto.sessionCount,
        benefits: dto.benefits ?? [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePlan(
    userId: string,
    role: string,
    code: string,
    dto: Partial<CreateLivePricingPlanInput>,
  ): Promise<LivePricingPlanRow> {
    this.assertAdmin(role);
    void userId;
    const existing = await this.prisma.livePricingPlan.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Live plan not found: ${code}`);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.short !== undefined) data.short = dto.short;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.sessionCount !== undefined) data.sessionCount = dto.sessionCount;
    if (dto.benefits !== undefined) data.benefits = dto.benefits;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.livePricingPlan.update({ where: { code }, data });
  }

  async deletePlan(userId: string, role: string, code: string): Promise<void> {
    this.assertAdmin(role);
    void userId;
    const existing = await this.prisma.livePricingPlan.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Live plan not found: ${code}`);

    const referenced = await this.prisma.liveSubscription.count({
      where: { planCode: code, deletedAt: null },
    });
    if (referenced > 0) {
      throw new ConflictException(
        `Cannot delete plan ${code}: it is referenced by ${String(referenced)} active subscription(s). Deactivate it instead.`,
      );
    }

    await this.prisma.livePricingPlan.delete({ where: { code } });
  }

  /** Bulk price update (backward-compatible replacement of the old pricing endpoint). */
  async updatePrices(
    userId: string,
    role: string,
    prices: Record<string, number>,
  ): Promise<Record<string, number>> {
    this.assertAdmin(role);
    void userId;
    const plans = await this.prisma.livePricingPlan.findMany();
    const byCode = new Map(plans.map((p) => [p.code, p]));

    await this.prisma.$transaction(
      Object.entries(prices).map(([code, price]) => {
        if (!byCode.has(code)) {
          throw new BadRequestException(`Live plan not found: ${code}`);
        }
        if (!Number.isFinite(price) || price < 0) {
          throw new BadRequestException(`Invalid price for ${code}`);
        }
        return this.prisma.livePricingPlan.update({ where: { code }, data: { price } });
      }),
    );

    return this.getPrices();
  }
}
