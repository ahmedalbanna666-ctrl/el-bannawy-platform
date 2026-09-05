import { Test, type TestingModule } from "@nestjs/testing";
import { WhatsAppService } from "./whatsapp.service";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/services/encryption.service";

describe("WhatsAppService", () => {
  let service: WhatsAppService;
  let prisma: {
    whatsAppConfig: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    whatsAppMessage: { create: jest.Mock; update: jest.Mock };
  };
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };
  let fetchMock: jest.Mock;

  const twilioConfig = {
    id: "cfg1",
    provider: "twilio",
    accountSid: "enc:AC123",
    authToken: "enc:tok",
    phoneNumber: "whatsapp:+14155238886",
    apiKey: null,
    apiUrl: null,
    isEnabled: true,
  };

  beforeEach(async () => {
    prisma = {
      whatsAppConfig: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      whatsAppMessage: { create: jest.fn(), update: jest.fn() },
    };
    encryption = {
      encrypt: jest.fn((s: string) => `enc:${s}`),
      decrypt: jest.fn((s: string) => (s.startsWith("enc:") ? s.slice(4) : s)),
    };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "SM123" }),
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it("normalizes Egyptian national numbers to E.164 before calling Twilio", async () => {
    prisma.whatsAppConfig.findFirst.mockResolvedValue(twilioConfig);
    prisma.whatsAppMessage.create.mockResolvedValue({ id: "log1" });
    prisma.whatsAppMessage.update.mockResolvedValue({});

    const result = await service.sendTestMessage("01001234567", "hi");

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("SM123");
    const [, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(options.body).toContain("To=whatsapp%3A%2B201001234567");
  });

  it("strips the 00 international prefix before normalizing", async () => {
    prisma.whatsAppConfig.findFirst.mockResolvedValue(twilioConfig);
    prisma.whatsAppMessage.create.mockResolvedValue({ id: "log1" });
    prisma.whatsAppMessage.update.mockResolvedValue({});

    await service.sendTestMessage("00201001234567", "hi");

    const [, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(options.body).toContain("To=whatsapp%3A%2B201001234567");
  });

  it("fails fast without calling the provider when disabled", async () => {
    prisma.whatsAppConfig.findFirst.mockResolvedValue({ ...twilioConfig, isEnabled: false });
    prisma.whatsAppMessage.create.mockResolvedValue({ id: "log1" });
    prisma.whatsAppMessage.update.mockResolvedValue({});

    const result = await service.sendTestMessage("+201001234567", "hi");

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.whatsAppMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });

  it("encrypts secrets on update and reports which are configured", async () => {
    const empty = { ...twilioConfig, accountSid: null, authToken: null, apiKey: null };
    prisma.whatsAppConfig.findFirst.mockResolvedValue(empty);
    prisma.whatsAppConfig.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      ...empty,
      ...args.data,
    }));

    const result = await service.updateConfig({ accountSid: "AC123", apiKey: "k" });

    expect(encryption.encrypt).toHaveBeenCalledWith("AC123");
    expect(prisma.whatsAppConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountSid: "enc:AC123", apiKey: "enc:k" }) }),
    );
    expect(result.hasAccountSid).toBe(true);
    expect(result.hasApiKey).toBe(true);
    expect(result.hasAuthToken).toBe(false);
    expect(result).not.toHaveProperty("authToken");
    expect(result).not.toHaveProperty("apiKey");
  });

  it("reports configured secrets in getConfig without exposing values", async () => {
    prisma.whatsAppConfig.findFirst.mockResolvedValue(twilioConfig);

    const result = await service.getConfig();

    expect(result.hasAccountSid).toBe(true);
    expect(result.hasAuthToken).toBe(true);
    expect(result.hasApiKey).toBe(false);
    expect(result).not.toHaveProperty("authToken");
  });

  it("falls back to the raw value when a stored secret is legacy plaintext", async () => {
    prisma.whatsAppConfig.findFirst.mockResolvedValue({ ...twilioConfig, accountSid: "plain-sid", authToken: "plain-tok" });
    prisma.whatsAppMessage.create.mockResolvedValue({ id: "log1" });
    prisma.whatsAppMessage.update.mockResolvedValue({});

    const result = await service.sendTestMessage("+201001234567", "hi");

    expect(result.success).toBe(true);
    const [, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    const decoded = Buffer.from(options.headers.Authorization.replace("Basic ", ""), "base64").toString("utf8");
    expect(decoded).toBe("plain-sid:plain-tok");
  });
});
