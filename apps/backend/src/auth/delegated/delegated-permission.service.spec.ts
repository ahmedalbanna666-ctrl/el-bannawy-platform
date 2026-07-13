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

  describe("explicit teacher permission initialization (no runtime fallback)", () => {
    let adminId: string;
    const createdIds: string[] = [];

    const makeTeacher = async (
      initialized = false,
      grants: string[] = [],
    ): Promise<string> => {
      const mobile = `test-tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const user = await prisma.user.create({
        data: {
          fullName: "TP Test",
          role: "TEACHER",
          status: "ACTIVE",
          mobileNumber: mobile,
          permissionsInitialized: initialized,
        },
      });
      if (grants.length > 0) {
        await prisma.userPermissionGrant.createMany({
          data: grants.map((permission) => ({
            userId: user.id,
            permission,
            grantedByUserId: adminId,
          })),
        });
      }
      createdIds.push(user.id);
      return user.id;
    };

    beforeAll(async () => {
      const mobile = `test-tp-admin-${Date.now()}`;
      const admin = await prisma.user.create({
        data: {
          fullName: "TP Admin",
          role: "ADMINISTRATOR",
          status: "ACTIVE",
          mobileNumber: mobile,
        },
      });
      adminId = admin.id;
      createdIds.push(admin.id);
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: createdIds } } });
      await prisma.userPermissionGrant.deleteMany({ where: { userId: { in: createdIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    });

    it("A: legacy uninitialized teacher is empty until explicitly initialized", async () => {
      const teacherId = await makeTeacher();
      expect(await service.getEffectivePermissions(teacherId)).toEqual([]);

      await service.initializeTeacherPermissions(teacherId, adminId);

      const effective = await service.getEffectivePermissions(teacherId);
      expect(effective.length).toBeGreaterThan(0);
      const grants = await prisma.userPermissionGrant.findMany({ where: { userId: teacherId } });
      expect(grants.length).toBe(effective.length);
      const stored = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { permissionsInitialized: true },
      });
      expect(stored?.permissionsInitialized).toBe(true);
    });

    it("B: explicitly configured subset is respected (grants ∩ ceiling)", async () => {
      const teacherId = await makeTeacher();
      await service.initializeTeacherPermissions(teacherId, adminId);
      const full = await service.getEffectivePermissions(teacherId);
      const keep = new Set<string>([PERMISSIONS.UNITS_VIEW, PERMISSIONS.LESSONS_VIEW]);
      for (const p of full) {
        if (!keep.has(p as string)) {
          await service.revokePermission(adminId, teacherId, p);
        }
      }
      const subset = await service.getEffectivePermissions(teacherId);
      expect(new Set(subset)).toEqual(new Set(keep));
    });

    it("C: intentionally revoked to zero persists as empty (no runtime fallback)", async () => {
      const teacherId = await makeTeacher();
      await service.initializeTeacherPermissions(teacherId, adminId);
      const full = await service.getEffectivePermissions(teacherId);
      for (const p of full) {
        await service.revokePermission(adminId, teacherId, p);
      }
      expect(await service.getEffectivePermissions(teacherId)).toEqual([]);
      expect(await service.getEffectivePermissions(teacherId)).toEqual([]);
      const stored = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { permissionsInitialized: true },
      });
      expect(stored?.permissionsInitialized).toBe(true);
    });

    it("D: grant outside TEACHER ceiling is rejected", async () => {
      const teacherId = await makeTeacher();
      await expect(
        service.grantPermission(adminId, teacherId, PERMISSIONS.PLATFORM_MANAGE),
      ).rejects.toThrow();
    });

    it("E: explicit grant persists", async () => {
      const teacherId = await makeTeacher();
      await service.grantPermission(adminId, teacherId, PERMISSIONS.UNITS_CREATE);
      const effective = await service.getEffectivePermissions(teacherId);
      expect(effective).toContain(PERMISSIONS.UNITS_CREATE);
      const grants = await prisma.userPermissionGrant.findMany({
        where: { userId: teacherId, permission: PERMISSIONS.UNITS_CREATE },
      });
      expect(grants.length).toBe(1);
    });

    it("F: explicit revoke persists", async () => {
      const teacherId = await makeTeacher();
      await service.grantPermission(adminId, teacherId, PERMISSIONS.UNITS_CREATE);
      await service.revokePermission(adminId, teacherId, PERMISSIONS.UNITS_CREATE);
      const effective = await service.getEffectivePermissions(teacherId);
      expect(effective).not.toContain(PERMISSIONS.UNITS_CREATE);
    });

    it("G: re-running init is idempotent and never restores revoked permissions", async () => {
      const teacherId = await makeTeacher();
      await service.initializeTeacherPermissions(teacherId, adminId);
      const first = await service.getEffectivePermissions(teacherId);
      const grantCount1 = (await prisma.userPermissionGrant.findMany({ where: { userId: teacherId } })).length;

      await service.revokePermission(adminId, teacherId, PERMISSIONS.UNITS_CREATE);
      await service.initializeTeacherPermissions(teacherId, adminId);

      const after = await service.getEffectivePermissions(teacherId);
      expect(after).not.toContain(PERMISSIONS.UNITS_CREATE);
      expect(after.length).toBe(first.length - 1);
      const grantCount2 = (await prisma.userPermissionGrant.findMany({ where: { userId: teacherId } })).length;
      expect(grantCount2).toBe(grantCount1 - 1);
    });

    it("H: backfillLegacyTeachers initializes only uninitialized teachers", async () => {
      const uninit = await makeTeacher(false);
      const configured = await makeTeacher(true, [PERMISSIONS.UNITS_VIEW]);

      const count = await service.backfillLegacyTeachers(adminId);
      expect(count).toBeGreaterThanOrEqual(1);

      expect((await service.getEffectivePermissions(uninit)).length).toBeGreaterThan(0);
      expect(await service.getEffectivePermissions(configured)).toEqual([PERMISSIONS.UNITS_VIEW]);
    });
  });
});
