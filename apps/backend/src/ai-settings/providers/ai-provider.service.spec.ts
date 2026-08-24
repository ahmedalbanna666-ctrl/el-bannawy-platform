import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { AiProviderService } from "./ai-provider.service";
import { AiCostService } from "./ai-cost.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";

describe("AiProviderService — OpenCode Zen (OpenAI-compatible)", () => {
  let service: AiProviderService;
  let fetchMock: jest.Mock;

  const opencodeConfig = {
    id: "oc-1",
    provider: "opencode",
    modelName: "deepseek-v4-flash-free",
    apiKey: "sk-opencode-secret",
    baseUrl: "https://opencode.ai/zen/v1",
    apiType: "OPENAI_COMPATIBLE_CHAT",
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30,
    supportsStreaming: true,
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProviderService,
        {
          provide: PrismaService,
          useValue: {
            aiModelConfig: {
              findMany: jest.fn().mockResolvedValue([opencodeConfig]),
              findFirst: jest.fn().mockResolvedValue(opencodeConfig),
              update: jest.fn().mockResolvedValue(opencodeConfig),
            },
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            decrypt: jest.fn().mockReturnValue("sk-opencode-secret"),
          },
        },
        {
          provide: AiCostService,
          useValue: {
            computeChatCost: jest.fn().mockReturnValue({
              requestCost: 0,
              responseCost: 0,
              cacheCost: 0,
              totalCost: 0,
            }),
            currency: "USD",
          },
        },
      ],
    }).compile();

    service = module.get<AiProviderService>(AiProviderService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("endpoint construction", () => {
    it("builds the correct OpenCode Zen chat completions URL (base URL + /chat/completions)", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          choices: [{ message: { content: "Hello from OpenCode Zen" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      await service.chat([{ role: "user", content: "hi" }]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://opencode.ai/zen/v1/chat/completions");
      expect(init.method).toBe("POST");
      // Authorization header must carry the bearer token
      expect(init.headers.Authorization).toBe("Bearer sk-opencode-secret");
    });

    it("never appends a double /chat/completions when baseUrl already ends with it", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: {},
        }),
      });

      const fullUrlConfig = { ...opencodeConfig, baseUrl: "https://opencode.ai/zen/v1/chat/completions" };
      (service as unknown as { getEnabledConfigs: () => Promise<unknown[]> }).getEnabledConfigs = jest
        .fn()
        .mockResolvedValue([fullUrlConfig]);

      await service.chat([{ role: "user", content: "hi" }]);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://opencode.ai/zen/v1/chat/completions");
    });

    it("sends the correct model id and OpenAI-compatible body", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: {},
        }),
      });

      await service.chat([
        { role: "system", content: "You are an English tutor." },
        { role: "user", content: "What is the present perfect?" },
      ]);

      const [_, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("deepseek-v4-flash-free");
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe("system");
      expect(body.messages[1].content).toBe("What is the present perfect?");
      expect(body.stream).toBe(false);
    });
  });

  describe("error handling", () => {
    it.each([401, 403, 404, 429, 500])("marks provider unhealthy on HTTP %i and fails over to null", async (status) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => `error ${status}`,
      });

      const result = await service.chat([{ role: "user", content: "hi" }]);
      expect(result).toBeNull();
    });

    it("propagates the http status in the error message without leaking the api key", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => "invalid credentials",
      });

      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const errSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

      await service.chat([{ role: "user", content: "hi" }]);

      const allLogs = `${warnSpy.mock.calls.map((c) => c.join(" ")).join("\n")}\n${errSpy.mock.calls.map((c) => c.join(" ")).join("\n")}`;
      expect(allLogs).toContain("HTTP 401");
      expect(allLogs).not.toContain("sk-opencode-secret");
      expect(allLogs).not.toContain("Bearer");

      warnSpy.mockRestore();
      errSpy.mockRestore();
    });

    it("handles timeout by aborting and returning null", async () => {
      fetchMock.mockRejectedValue(new Error("aborted"));

      const result = await service.chat([{ role: "user", content: "hi" }]);
      expect(result).toBeNull();
    });
  });
});
