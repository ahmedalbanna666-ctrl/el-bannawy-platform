import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AiCostService } from "./ai-cost.service";

describe("AiCostService", () => {
  let service: AiCostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCostService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === "ai.prices") {
                return {
                  "deepseek-v4-flash-free": {
                    inputPerMillion: 0,
                    outputPerMillion: 0,
                    cachedInputPerMillion: 0,
                    embeddingPerMillion: 0.02,
                  },
                };
              }
              if (key === "ai.costCurrency") return "USD";
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiCostService>(AiCostService);
  });

  describe("deepseek-v4-flash-free pricing", () => {
    it("returns zero cost for the free OpenCode Zen model", () => {
      const rate = service.getRate("deepseek-v4-flash-free");
      expect(rate.inputPerMillion).toBe(0);
      expect(rate.outputPerMillion).toBe(0);
      expect(rate.cachedInputPerMillion).toBe(0);
    });

    it("computes null cost for a free model request (no meaningful spend)", () => {
      const result = service.computeChatCost("deepseek-v4-flash-free", {
        tokensIn: 1000,
        tokensOut: 500,
      });
      // The free model prices are 0 per million tokens, so computed costs round to 0
      // and the service reports null (meaning "no measurable cost").
      expect(result.totalCost).toBeNull();
      expect(result.requestCost).toBe(0);
      expect(result.responseCost).toBe(0);
    });

    it("falls back to gpt-4o-mini pricing for unknown models", () => {
      const rate = service.getRate("unknown-model-xyz");
      expect(rate.inputPerMillion).toBeGreaterThan(0);
    });
  });

  describe("token estimation", () => {
    it("estimates tokens from character count", () => {
      const text = "hello world this is a test message";
      expect(service.estimateTokens(text)).toBeGreaterThan(0);
    });

    it("returns zero for empty input", () => {
      expect(service.estimateTokens("")).toBe(0);
    });
  });
});
