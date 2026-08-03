import { Test, type TestingModule } from "@nestjs/testing";
import { PageStatusService } from "./page-status.service";
import { PrismaService } from "../prisma/prisma.service";

describe("PageStatusService", () => {
  let service: PageStatusService;
  let prisma: {
    systemSetting: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      systemSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageStatusService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PageStatusService>(PageStatusService);
  });

  describe("getStatus", () => {
    it("returns default config when no setting is stored", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getStatus();
      expect(result.global.disabled).toBe(false);
      expect(result.pages).toEqual({});
    });

    it("parses stored JSON config", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        key: "page_statuses",
        value: JSON.stringify({
          global: { disabled: true, title: "قيد الصيانة", message: "نعود قريباً", whatsapp: "201000000000" },
          pages: { competitions: { disabled: true, title: "قيد التطوير", message: "ستكون متاحة قريباً", whatsapp: "" } },
        }),
      });

      const result = await service.getStatus();
      expect(result.global.disabled).toBe(true);
      expect(result.global.whatsapp).toBe("201000000000");
      expect(result.pages.competitions.disabled).toBe(true);
    });

    it("falls back to defaults for malformed JSON", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        key: "page_statuses",
        value: "{not-json",
      });

      const result = await service.getStatus();
      expect(result.global.disabled).toBe(false);
    });
  });

  describe("updateGlobal", () => {
    it("updates global entry and persists config", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);
      prisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.updateGlobal({
        disabled: true,
        title: "صيانة عامة",
        message: "المنصة قيد التطوير",
        whatsapp: "201000000000",
      });

      expect(result.global.disabled).toBe(true);
      expect(result.global.whatsapp).toBe("201000000000");
      expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(1);
      const writeValue = JSON.parse(prisma.systemSetting.upsert.mock.calls[0][0].create.value);
      expect(writeValue.global.disabled).toBe(true);
    });

    it("preserves existing fields when dto omits them", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        key: "page_statuses",
        value: JSON.stringify({
          global: { disabled: false, title: "قديم", message: "قديم", whatsapp: "201000000000" },
          pages: {},
        }),
      });
      prisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.updateGlobal({ disabled: true });

      expect(result.global.disabled).toBe(true);
      expect(result.global.title).toBe("قديم");
      expect(result.global.whatsapp).toBe("201000000000");
    });
  });

  describe("updatePage", () => {
    it("updates a specific page entry", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue(null);
      prisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.updatePage("competitions", {
        disabled: true,
        title: "قيد التطوير",
        message: "ستكون متاحة قريباً",
      });

      expect(result.pages.competitions.disabled).toBe(true);
      expect(result.pages.competitions.title).toBe("قيد التطوير");
      expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(1);
    });

    it("enables a previously disabled page", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        key: "page_statuses",
        value: JSON.stringify({
          global: { disabled: false, title: "", message: "", whatsapp: "" },
          pages: { shop: { disabled: true, title: "مغلق", message: "قريباً", whatsapp: "" } },
        }),
      });
      prisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.updatePage("shop", { disabled: false });

      expect(result.pages.shop.disabled).toBe(false);
      expect(result.pages.shop.title).toBe("مغلق");
    });
  });
});
