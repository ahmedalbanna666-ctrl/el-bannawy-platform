import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import type { AiCostRate } from "../../config/ai.config";

export interface AiCostBreakdown {
  requestCost: number | null;
  responseCost: number | null;
  embeddingCost: number | null;
  cacheCost: number | null;
  totalCost: number | null;
  currency: string;
}

@Injectable()
export class AiCostService {
  constructor(private readonly config: ConfigService) {}

  getRate(modelName: string): AiCostRate {
    const prices = this.config.get<Record<string, AiCostRate>>("ai.prices") ?? {};
    const DEFAULT_RATE: AiCostRate = {
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
      cachedInputPerMillion: 0.075,
      embeddingPerMillion: 0.02,
    };
    if (modelName in prices) return prices[modelName];
    if ("gpt-4o-mini" in prices) return prices["gpt-4o-mini"];
    return DEFAULT_RATE;
  }

  get currency(): string {
    return this.config.get<string>("ai.costCurrency") ?? "USD";
  }

  round(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  computeChatCost(
    modelName: string,
    tokens: { tokensIn?: number; tokensOut?: number; cachedReadTokens?: number; cachedWriteTokens?: number },
  ): Pick<AiCostBreakdown, "requestCost" | "responseCost" | "cacheCost" | "totalCost"> {
    const rate = this.getRate(modelName);
    const tokensIn = tokens.tokensIn ?? 0;
    const tokensOut = tokens.tokensOut ?? 0;
    const cachedRead = tokens.cachedReadTokens ?? 0;
    const cachedWrite = tokens.cachedWriteTokens ?? 0;

    const freshInput = Math.max(0, tokensIn - cachedRead);
    const requestCost = this.round((freshInput / 1_000_000) * rate.inputPerMillion);
    const responseCost = this.round((tokensOut / 1_000_000) * rate.outputPerMillion);
    const cacheCost = this.round(
      ((cachedRead / 1_000_000) * rate.cachedInputPerMillion) + ((cachedWrite / 1_000_000) * rate.inputPerMillion),
    );
    const totalCost = this.round(requestCost + responseCost + cacheCost);

    return {
      requestCost: tokensIn > 0 ? requestCost : null,
      responseCost: tokensOut > 0 ? responseCost : null,
      cacheCost: cacheCost > 0 ? cacheCost : null,
      totalCost: totalCost > 0 ? totalCost : null,
    };
  }

  computeEmbeddingCost(
    modelName: string,
    tokens: number,
  ): { embeddingTokens: number; embeddingCost: number | null } {
    const rate = this.getRate(modelName);
    const embeddingCost = tokens > 0 ? this.round((tokens / 1_000_000) * rate.embeddingPerMillion) : null;
    return { embeddingTokens: tokens, embeddingCost };
  }

  estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    return Math.max(words, Math.round(chars / 4));
  }
}
