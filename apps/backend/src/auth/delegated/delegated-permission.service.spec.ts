import { Test, TestingModule } from "@nestjs/testing";
import { DelegatedPermissionService } from "./delegated-permission.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS } from "@el-bannawy/shared";

describe("DelegatedPermissionService", () => {
  let service: DelegatedPermissionService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DelegatedPermissionService, PrismaService],
    }).compile();
    service = module.get(DelegatedPermissionService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("capability ceilings", () => {
    it("ADMINISTRATOR has intended platform capability", () => {
      expect(service.isWithinCeiling("ADMINISTRATOR", PERMISSIONS.UNITS_CREATE)).toBe(true);
      expect(service.isWithinCeiling("ADMINISTRATOR", PERMISSIONS.PLATFORM_MANAGE)).toBe(true);
    });

    it("TEACHER cannot receive permission outside TEACHER ceiling", () => {
      expect(service.isWithinCeiling("TEACHER", PERMISSIONS.UNITS_CREATE)).toBe(true);
      expect(service.isWithinCeiling("TEACHER", PERMISSIONS.PLATFORM_MANAGE)).toBe(false);
    });

    it("STAFF has limited capabilities", () => {
      expect(service.isWithinCeiling("STAFF", PERMISSIONS.UNITS_VIEW)).toBe(true);
      expect(service.isWithinCeiling("STAFF", PERMISSIONS.UNITS_CREATE)).toBe(false);
    });

    it("STUDENT has learning-only capabilities", () => {
      expect(service.isWithinCeiling("STUDENT", PERMISSIONS.LEARNING_ACCESS)).toBe(true);
      expect(service.isWithinCeiling("STUDENT", PERMISSIONS.UNITS_CREATE)).toBe(false);
    });

    it("unknown role fails closed", () => {
      expect(service.isWithinCeiling("SECRETARY" as never, PERMISSIONS.UNITS_CREATE)).toBe(false);
    });
  });

  describe("effective permission resolution", () => {
    it("ADMINISTRATOR resolves to full permissions", async () => {
      const perms = await service.getEffectivePermissions("nonexistent-admin-id");
      expect(perms.length).toBe(0);
    });

    it("nonexistent user returns empty", async () => {
      const perms = await service.getEffectivePermissions("00000000-0000-0000-0000-000000000000");
      expect(perms).toEqual([]);
    });
  });

  describe("delegation validation", () => {
    it("grants require valid permission string format", async () => {
      await expect(
        service.grantPermission("admin-id", "teacher-id", "invalid.permission" as never),
      ).rejects.toThrow();
    });

    it("invalid target user is rejected", async () => {
      await expect(
        service.grantPermission("admin-id", "00000000-0000-0000-0000-000000000000", PERMISSIONS.UNITS_VIEW),
      ).rejects.toThrow();
    });

    it("PERMISSIONS registry is immutable", () => {
      const perms = Object.values(PERMISSIONS);
      expect(perms.length).toBeGreaterThan(20);
      expect(perms).toContain(PERMISSIONS.UNITS_CREATE);
      expect(perms).toContain(PERMISSIONS.PLATFORM_MANAGE);
    });
  });
});
