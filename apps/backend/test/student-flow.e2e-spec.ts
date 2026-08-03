jest.setTimeout(60000);

import { type TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../src/auth/auth.service";
import { AuthRepository } from "../src/auth/auth.repository";
import { FirebaseAuthService } from "../src/auth/firebase-auth.service";
import { ProfileService } from "../src/profile/profile.service";
import { BootstrapService } from "../src/common/services/bootstrap.service";
import { DelegatedPermissionService } from "../src/auth/delegated/delegated-permission.service";
import { AcademicContextService } from "../src/common/services/academic-context.service";
import { MailService } from "../src/mail/mail.service";
import { createTestingModule } from "./helpers/test-module";
import { v4 as uuidv4 } from "uuid";

describe("Student Full Flow (e2e)", () => {
  let authService: AuthService;
  let profileService: ProfileService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const module: TestingModule = await createTestingModule({
      providers: [
        AuthService,
        AuthRepository,
        ProfileService,
        AcademicContextService,
        { provide: BootstrapService, useValue: { bootstrapNewStudent: jest.fn().mockResolvedValue(undefined) } },
        { provide: DelegatedPermissionService, useValue: { getEffectivePermissions: jest.fn().mockResolvedValue([]) } },
        { provide: MailService, useValue: { sendVerificationCode: jest.fn().mockResolvedValue({ success: false }), sendEmail: jest.fn().mockResolvedValue({ success: false }) } },
        { provide: FirebaseAuthService, useValue: { isConfigured: jest.fn().mockReturnValue(false), verifyIdToken: jest.fn() } },
      ],
    });
    authService = module.get(AuthService);
    profileService = module.get(ProfileService);
    prisma = new PrismaClient();
  });

  async function registerVerifiedStudent(payload: Parameters<AuthService["register"]>[0]): Promise<{ userId: string; requiresEmailVerification: boolean }> {
    const result = await authService.register(payload);
    await prisma.user.update({
      where: { id: result.userId },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
    return result;
  }

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"users\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"refresh_tokens\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"sessions\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"stages\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"grades\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"system_settings\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"academic_years\" CASCADE");
    await prisma.$executeRawUnsafe("TRUNCATE TABLE \"terms\" CASCADE");

    // Seed stages and grades matching the registration flow
    const stage1 = await prisma.stage.create({ data: { id: uuidv4(), name: "ابتدائي", displayOrder: 1 } });
    const stage2 = await prisma.stage.create({ data: { id: uuidv4(), name: "إعدادي", displayOrder: 2 } });
    const stage3 = await prisma.stage.create({ data: { id: uuidv4(), name: "ثانوي", displayOrder: 3 } });

    const primaryGrade1 = await prisma.grade.create({ data: { id: uuidv4(), name: "الصف الأول الابتدائي", displayOrder: 1, stageId: stage1.id } });
    await prisma.grade.create({ data: { id: uuidv4(), name: "الصف الثاني الابتدائي", displayOrder: 2, stageId: stage1.id } });
    const prepGrade1 = await prisma.grade.create({ data: { id: uuidv4(), name: "الصف الأول الإعدادي", displayOrder: 1, stageId: stage2.id } });
    const secondaryGrade1 = await prisma.grade.create({ data: { id: uuidv4(), name: "الصف الأول الثانوي", displayOrder: 1, stageId: stage3.id } });

    // Store grade IDs for tests
    (globalThis as Record<string, unknown>).__TEST_GRADE_IDS__ = {
      primaryGrade1: primaryGrade1.id,
      prepGrade1: prepGrade1.id,
      secondaryGrade1: secondaryGrade1.id,
    };

    // Set active academic year and term
    const academicYear = await prisma.academicYear.create({
      data: { id: uuidv4(), name: "2025-2026", isActive: true },
    });
    const term = await prisma.term.create({
      data: { id: uuidv4(), name: "الترم الأول", academicYearId: academicYear.id, displayOrder: 1 },
    });

    await prisma.systemSetting.upsert({
      where: { key: "active_academic_year_id" },
      update: { value: academicYear.id },
      create: { key: "active_academic_year_id", value: academicYear.id },
    });
    await prisma.systemSetting.upsert({
      where: { key: "active_term_id" },
      update: { value: term.id },
      create: { key: "active_term_id", value: term.id },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. REGISTRATION WITH GRADE + STAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe("1. Registration with academic context", () => {
    it("registers student with PRIMARY stage and grade", async () => {
      const result = await registerVerifiedStudent({
        fullName: "Ahmed Student",
        email: "ahmed@example.com",
        mobile: "+201000000001",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "PRIMARY",
        grade: "الصف الأول الابتدائي",
        educationalSystem: "GENERAL",
      });
      expect(result).toHaveProperty("userId");

      // Verify gradeId was set on the user
      const user = await prisma.user.findUnique({ where: { id: result.userId }, select: { gradeId: true, educationalSystem: true, academicYearId: true, termId: true } });
      expect(user?.gradeId).toBeTruthy();
      expect(user?.educationalSystem).toBe("GENERAL");
      expect(user?.academicYearId).toBeTruthy();
      expect(user?.termId).toBeTruthy();
    });

    it("registers student with PREPARATORY stage", async () => {
      const result = await registerVerifiedStudent({
        fullName: "Mohamed Student",
        email: "mohamed@example.com",
        mobile: "+201000000002",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "PREPARATORY",
        grade: "الصف الأول الإعدادي",
        educationalSystem: "LANGUAGE",
      });
      expect(result).toHaveProperty("userId");

      const user = await prisma.user.findUnique({ where: { id: result.userId }, select: { gradeId: true, educationalSystem: true } });
      expect(user?.gradeId).toBeTruthy();
      expect(user?.educationalSystem).toBe("LANGUAGE");
    });

    it("registers student with SECONDARY stage", async () => {
      const result = await registerVerifiedStudent({
        fullName: "Ali Student",
        email: "ali@example.com",
        mobile: "+201000000003",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "SECONDARY",
        grade: "الصف الأول الثانوي",
        educationalSystem: "INTERNATIONAL",
      });
      expect(result).toHaveProperty("userId");

      const user = await prisma.user.findUnique({ where: { id: result.userId }, select: { gradeId: true, educationalSystem: true } });
      expect(user?.gradeId).toBeTruthy();
      expect(user?.educationalSystem).toBe("INTERNATIONAL");
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. LOGIN + GET PROFILE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe("2. Login and profile verification", () => {
    it("logs in and returns profile with grade info", async () => {
      const registration = await registerVerifiedStudent({
        fullName: "Test Student",
        email: "login-student@example.com",
        mobile: "+201000000010",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "PRIMARY",
        grade: "الصف الأول الابتدائي",
      });
      expect(registration).toHaveProperty("userId");

      // Login
      const login = await authService.login({ identity: "+201000000010", password: "StrongP@ss1" });
      expect(login).toHaveProperty("accessToken");
      expect(login).toHaveProperty("refreshToken");

      // Get profile via getMe
      const profile = await authService.getMe(registration.userId);
      expect(profile).toHaveProperty("id");
      expect(profile).toHaveProperty("gradeId");
      expect(profile.gradeId).toBeTruthy();
      expect((profile as Record<string, unknown>).educationalSystem).toBeDefined();
    });

    it("returns educational data through profile service", async () => {
      const { userId } = await registerVerifiedStudent({
        fullName: "Profile Test",
        email: "profile-student@example.com",
        mobile: "+201000000020",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "SECONDARY",
        grade: "الصف الأول الثانوي",
        educationalSystem: "GENERAL",
      });

      const profile = await profileService.getProfile(userId) as Record<string, unknown>;
      const roleProfile = profile.roleProfile as Record<string, unknown>;

      expect(profile.educationalSystem).toBe("GENERAL");
      expect(roleProfile.grade).toBeTruthy();
      expect((roleProfile.grade as Record<string, unknown>).name).toBe("الصف الأول الثانوي");
      expect(roleProfile.stage).toBeTruthy();
      expect((roleProfile.stage as Record<string, unknown>).name).toBe("ثانوي");
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. PROFILE EDIT (change grade)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe("3. Edit profile grade", () => {
    it("changes student grade and persists", async () => {
      const { userId } = await registerVerifiedStudent({
        fullName: "Edit Test",
        email: "edit-student@example.com",
        mobile: "+201000000030",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "PRIMARY",
        grade: "الصف الأول الابتدائي",
      });

      // Change grade to preparatory
      const grades = (globalThis as Record<string, unknown>).__TEST_GRADE_IDS__ as Record<string, string>;
      const updated = await profileService.updateProfile(userId, { gradeId: grades.prepGrade1 }) as Record<string, unknown>;
      const roleProfile = updated.roleProfile as Record<string, unknown>;

      expect((roleProfile.grade as Record<string, unknown>).name).toBe("الصف الأول الإعدادي");
      expect((roleProfile.stage as Record<string, unknown>).name).toBe("إعدادي");
    });

    it("changes educational system", async () => {
      const { userId } = await registerVerifiedStudent({
        fullName: "System Test",
        email: "system-student@example.com",
        mobile: "+201000000040",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "PRIMARY",
        grade: "الصف الأول الابتدائي",
        educationalSystem: "GENERAL",
      });

      const updated = await profileService.updateProfile(userId, { educationalSystem: "LANGUAGE" }) as Record<string, unknown>;
      expect(updated.educationalSystem).toBe("LANGUAGE");
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. END-TO-END FULL FLOW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe("4. Complete student lifecycle", () => {
    it("completes the full student journey", async () => {
      // Step 1: Register with academic context
      const registerResult = await registerVerifiedStudent({
        fullName: "Full Flow Student",
        email: "fullflow-student@example.com",
        mobile: "+201000000050",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        educationalStage: "SECONDARY",
        grade: "الصف الأول الثانوي",
        educationalSystem: "GENERAL",
      });
      expect(registerResult).toHaveProperty("userId");

      // Step 2: Verify user in DB has correct grade
      const dbUser = await prisma.user.findUnique({ where: { id: registerResult.userId }, include: { assignedGrade: { include: { stage: true } } } });
      expect(dbUser?.assignedGrade?.name).toBe("الصف الأول الثانوي");
      expect(dbUser?.assignedGrade?.stage.name).toBe("ثانوي");
      expect(dbUser?.educationalSystem).toBe("GENERAL");

      // Step 3: Login
      const loginResult = await authService.login({ identity: "+201000000050", password: "StrongP@ss1" });
      expect(loginResult).toHaveProperty("accessToken");

      // Step 4: Get profile (getMe)
      const meProfile = await authService.getMe(registerResult.userId) as Record<string, unknown>;
      expect(meProfile.gradeId).toBe(dbUser?.gradeId);

      // Step 5: Get full profile with roleProfile
      const fullProfile = await profileService.getProfile(registerResult.userId) as Record<string, unknown>;
      const roleProfile = fullProfile.roleProfile as Record<string, unknown>;
      expect(roleProfile.grade).toBeTruthy();
      expect(roleProfile.stage).toBeTruthy();

      // Step 6: Change grade via profile edit
      const grades = (globalThis as Record<string, unknown>).__TEST_GRADE_IDS__ as Record<string, string>;
      await profileService.updateProfile(registerResult.userId, { gradeId: grades.prepGrade1 });

      // Step 7: Verify grade change persisted
      const updatedProfile = await profileService.getProfile(registerResult.userId) as Record<string, unknown>;
      const updatedRoleProfile = updatedProfile.roleProfile as Record<string, unknown>;
      expect((updatedRoleProfile.grade as Record<string, unknown>).name).toBe("الصف الأول الإعدادي");
      expect((updatedRoleProfile.stage as Record<string, unknown>).name).toBe("إعدادي");
    });
  });
});
