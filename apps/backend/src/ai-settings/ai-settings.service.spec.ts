import { Test, type TestingModule } from "@nestjs/testing";
import { AiSettingsService } from "./ai-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/services/encryption.service";
import { CacheService } from "../common/services/cache.service";
import { ConfigurationService } from "../config/configuration.service";
import { AiProviderService } from "./providers/ai-provider.service";

describe("AiSettingsService — OpenCode provider bootstrap", () => {
  let service: AiSettingsService;
  let findFirst: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;

  beforeEach(async () => {
    findFirst = jest.fn();
    create = jest.fn();
    update = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSettingsService,
        {
          provide: PrismaService,
          useValue: {
            aiModelConfig: { findFirst, create, update, updateMany: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
          },
        },
        {
          provide: EncryptionService,
          useValue: { encrypt: jest.fn().mockReturnValue("encrypted-secret"), decrypt: jest.fn(), mask: jest.fn() },
        },
        { provide: AiProviderService, useValue: {} },
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() } },
        {
          provide: ConfigurationService,
          useValue: {
            opencode: {
              apiKey: "sk-opencode-test-key",
              baseUrl: "https://opencode.ai/zen/v1",
              defaultModel: "deepseek-v4-flash-free",
            },
          },
        },
      ],
    }).compile();

    service = module.get<AiSettingsService>(AiSettingsService);
  });

  it("creates the OpenCode config with encrypted key when no existing config", async () => {
    findFirst.mockResolvedValue(null);

    await service.bootstrapOpenCodeProvider();

    expect(create).toHaveBeenCalledWith({
      data: {
        provider: "opencode",
        modelName: "deepseek-v4-flash-free",
        apiKey: "encrypted-secret",
        baseUrl: "https://opencode.ai/zen/v1",
        apiType: "OPENAI_COMPATIBLE_CHAT",
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30,
        isEnabled: true,
        supportsStreaming: true,
        isActive: false,
      },
    });
  });

  it("updates the existing OpenCode config (idempotent)", async () => {
    findFirst.mockResolvedValue({ id: "oc-1" });

    await service.bootstrapOpenCodeProvider();

    expect(update).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does nothing when OPENCODE_API_KEY is empty", async () => {
    const emptyModule: TestingModule = await Test.createTestingModule({
      providers: [
        AiSettingsService,
        { provide: PrismaService, useValue: { aiModelConfig: { findFirst, create, update } } },
        { provide: EncryptionService, useValue: { encrypt: jest.fn(), decrypt: jest.fn(), mask: jest.fn() } },
        { provide: AiProviderService, useValue: {} },
        { provide: CacheService, useValue: {} },
        {
          provide: ConfigurationService,
          useValue: { opencode: { apiKey: "", baseUrl: "https://opencode.ai/zen/v1", defaultModel: "deepseek-v4-flash-free" } },
        },
      ],
    }).compile();

    const svc = emptyModule.get<AiSettingsService>(AiSettingsService);
    await svc.bootstrapOpenCodeProvider();

    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
