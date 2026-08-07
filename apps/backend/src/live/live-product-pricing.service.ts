import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  LIVE_PRODUCTS,
  type LiveProductCode,
} from "@el-bannawy/shared";

/**
 * LiveProductPricingService — source of truth for the six live product prices.
 *
 * Prices are persisted in SystemSetting under `live_product_prices` as a JSON
 * document keyed by LiveProductCode. A sensible default is applied when the
 * setting has not been configured yet (bootstrap phase). Only ADMINISTRATOR
 * (or TEACHER with an explicit permission) may update prices.
 */
@Injectable()
export class LiveProductPricingService {
  private readonly logger = new Logger(LiveProductPricingService.name);

  private static readonly SETTING_KEY = "live_product_prices";

  private static readonly DEFAULT_PRICES: Record<LiveProductCode, number> = {
    PRIVATE_PLAN_A: 500,
    PRIVATE_PLAN_B: 800,
    GROUP_PLAN_A: 300,
    GROUP_PLAN_B: 400,
    ONE_TIME: 200,
    FREE: 0,
  };

  /** Number of sessions included per billing period (Plan A = 1/week, Plan B = 2/week). */
  private static readonly SESSION_COUNTS: Record<LiveProductCode, number> = {
    PRIVATE_PLAN_A: 4,
    PRIVATE_PLAN_B: 8,
    GROUP_PLAN_A: 4,
    GROUP_PLAN_B: 8,
    ONE_TIME: 1,
    FREE: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  async getPrices(): Promise<Record<LiveProductCode, number>> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: LiveProductPricingService.SETTING_KEY },
    });
    if (!setting) return { ...LiveProductPricingService.DEFAULT_PRICES };

    try {
      const parsed = JSON.parse(setting.value) as Partial<Record<LiveProductCode, number>>;
      const merged = { ...LiveProductPricingService.DEFAULT_PRICES };
      for (const code of LIVE_PRODUCTS) {
        const value = parsed[code];
        if (typeof value === "number" && value >= 0) merged[code] = value;
      }
      return merged;
    } catch (error) {
      this.logger.warn(
        `Invalid live_product_prices payload, falling back to defaults: ${error instanceof Error ? error.message : "unknown"}`,
      );
      return { ...LiveProductPricingService.DEFAULT_PRICES };
    }
  }

  async getPrice(code: LiveProductCode): Promise<number> {
    const prices = await this.getPrices();
    return prices[code];
  }

  getSessionCount(code: LiveProductCode): number {
    return LiveProductPricingService.SESSION_COUNTS[code];
  }

  async updatePrices(
    userId: string,
    role: string,
    prices: Partial<Record<LiveProductCode, number>>,
  ): Promise<Record<LiveProductCode, number>> {
    if (role !== "ADMINISTRATOR") {
      throw new ForbiddenException("Only administrators can update live product prices");
    }
    const current = await this.getPrices();
    const next: Record<LiveProductCode, number> = { ...current };
    for (const code of LIVE_PRODUCTS) {
      const value = prices[code];
      if (value !== undefined) {
        if (!Number.isFinite(value) || value < 0) {
          throw new BadRequestException(`Invalid price for ${code}`);
        }
        next[code] = value;
      }
    }
    await this.prisma.systemSetting.upsert({
      where: { key: LiveProductPricingService.SETTING_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: LiveProductPricingService.SETTING_KEY, value: JSON.stringify(next) },
    });
    void userId;
    return next;
  }

  /** Resolve a live product code from a raw product type string. */
  static codeFromProductType(productType: string): LiveProductCode {
    if (!productType) throw new NotFoundException("Product type is required");
    if (productType.startsWith("LIVE_")) {
      const code = productType.slice("LIVE_".length) as LiveProductCode;
      if ((LIVE_PRODUCTS as readonly string[]).includes(code)) return code;
    }
    if (productType === "LIVE_FREE") return "FREE";
    throw new BadRequestException(`Unsupported live product type: ${productType}`);
  }
}
