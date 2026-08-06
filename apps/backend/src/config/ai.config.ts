import { registerAs } from "@nestjs/config";

export interface AiCostRate {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion: number;
  embeddingPerMillion: number;
}

const DEFAULT_PRICES: Record<string, AiCostRate> = {
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6, cachedInputPerMillion: 0.075, embeddingPerMillion: 0.02 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10, cachedInputPerMillion: 1.25, embeddingPerMillion: 0.02 },
  "gpt-4-turbo": { inputPerMillion: 10, outputPerMillion: 30, cachedInputPerMillion: 5, embeddingPerMillion: 0.02 },
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.3, cachedInputPerMillion: 0.0188, embeddingPerMillion: 0.02 },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5, cachedInputPerMillion: 0.3125, embeddingPerMillion: 0.02 },
  "gemini-2.0-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4, cachedInputPerMillion: 0.025, embeddingPerMillion: 0.02 },
  "claude-3-5-sonnet": { inputPerMillion: 3, outputPerMillion: 15, cachedInputPerMillion: 0.3, embeddingPerMillion: 0.02 },
  "claude-3-haiku": { inputPerMillion: 0.25, outputPerMillion: 1.25, cachedInputPerMillion: 0.03, embeddingPerMillion: 0.02 },
  "deepseek-v4-flash": { inputPerMillion: 0.14, outputPerMillion: 0.28, cachedInputPerMillion: 0.0028, embeddingPerMillion: 0.02 },
};

export default registerAs("ai", () => {
  const rawPrices = process.env.AI_MODEL_PRICES;
  let customPrices: Record<string, AiCostRate> = {};
  if (rawPrices) {
    try {
      customPrices = JSON.parse(rawPrices) as Record<string, AiCostRate>;
    } catch {
      customPrices = {};
    }
  }
  return {
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    endpoint: process.env.AI_ENDPOINT ?? "https://api.openai.com/v1/chat/completions",
    prices: { ...DEFAULT_PRICES, ...customPrices },
    costCurrency: process.env.AI_COST_CURRENCY ?? "USD",
  };
});
