import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS, type Permission, type UserRole } from "@el-bannawy/shared";

const CEILINGS: Record<UserRole, readonly Permission[]> = {
  ADMINISTRATOR: Object.values(PERMISSIONS),
  TEACHER: [
    PERMISSIONS.UNITS_VIEW, PERMISSIONS.UNITS_CREATE, PERMISSIONS.UNITS_EDIT, PERMISSIONS.UNITS_DELETE,
    PERMISSIONS.LESSONS_VIEW, PERMISSIONS.LESSONS_CREATE, PERMISSIONS.LESSONS_EDIT, PERMISSIONS.LESSONS_DELETE,
    PERMISSIONS.VIDEOS_UPLOAD, PERMISSIONS.PDFS_UPLOAD,
    PERMISSIONS.VOCABULARY_MANAGE, PERMISSIONS.HOMEWORK_MANAGE, PERMISSIONS.QUIZZES_MANAGE,
    PERMISSIONS.FINAL_REVIEW_VIEW, PERMISSIONS.FINAL_REVIEW_EDIT,
    PERMISSIONS.STORY_VIEW, PERMISSIONS.STORY_EDIT, PERMISSIONS.STORY_PUBLISH,
    PERMISSIONS.LIVE_VIEW, PERMISSIONS.LIVE_CREATE, PERMISSIONS.LIVE_EDIT, PERMISSIONS.LIVE_DELETE,
    PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.SUPPORT_ANSWER,
    PERMISSIONS.AI_MANAGE,
    PERMISSIONS.COINS_VIEW, PERMISSIONS.COINS_MANAGE, PERMISSIONS.COINS_GRANT, PERMISSIONS.COINS_UNLOCK,
    PERMISSIONS.UNLOCK_CODES_MANAGE, PERMISSIONS.UNLOCK_REQUESTS_MANAGE,
    PERMISSIONS.COMPETITION_MANAGE, PERMISSIONS.COMPETITION_VIEW,
    PERMISSIONS.LEARNING_ACCESS,
  ],
  STAFF: [
    PERMISSIONS.SUPPORT_ANSWER,
    PERMISSIONS.PDFS_UPLOAD,
    PERMISSIONS.VIDEOS_UPLOAD,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.LESSONS_VIEW, PERMISSIONS.LESSONS_EDIT,
    PERMISSIONS.UNITS_VIEW,
    PERMISSIONS.STORY_VIEW,
    PERMISSIONS.FINAL_REVIEW_VIEW,
    PERMISSIONS.LIVE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.LEARNING_ACCESS,
  ],
  STUDENT: [
    PERMISSIONS.LEARNING_ACCESS,
    PERMISSIONS.UNITS_VIEW,
    PERMISSIONS.LESSONS_VIEW,
    PERMISSIONS.STORY_VIEW,
    PERMISSIONS.FINAL_REVIEW_VIEW,
    PERMISSIONS.LIVE_VIEW,
    PERMISSIONS.COMPETITION_VIEW,
    PERMISSIONS.AI_MANAGE,
  ],
};

@Injectable()
export class DelegatedPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  isWithinCeiling(role: UserRole, permission: Permission): boolean {
    // Defensive: an unrecognized role must fail closed rather than throw.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return CEILINGS[role]?.includes(permission) ?? false;
  }

  async getEffectivePermissions(userId: string): Promise<readonly Permission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, managedByTeacherId: true, managedByTeacher: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (!user) return [];

    const ceiling = CEILINGS[user.role as UserRole];

    if (user.role === "ADMINISTRATOR") return [...ceiling];
    if (user.role === "STUDENT") return [...ceiling];

    const grants = await this.prisma.userPermissionGrant.findMany({
      where: { userId },
      select: { permission: true },
    });

    if (user.role === "TEACHER") {
      return [...new Set(grants.map((g) => g.permission as Permission))].filter(
        (p) => ceiling.includes(p),
      );
    }

    if (user.role === "STAFF") {
      const managingTeacher = user.managedByTeacher;
      if (!managingTeacher || managingTeacher.deletedAt || managingTeacher.status !== "ACTIVE") {
        return [];
      }
      const teacherPerms = await this.getEffectivePermissions(managingTeacher.id);
      return [...new Set(grants.map((g) => g.permission as Permission))].filter(
        (p) => ceiling.includes(p) && teacherPerms.includes(p),
      );
    }

    return [];
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const perms = await this.getEffectivePermissions(userId);
    return perms.includes(permission);
  }

  async assertPermission(userId: string, permission: Permission): Promise<void> {
    const has = await this.hasPermission(userId, permission);
    if (!has) {
      throw new ForbiddenException(`Missing required permission: ${permission}`);
    }
  }

  async grantPermission(
    actorId: string,
    targetUserId: string,
    permission: Permission,
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, managedByTeacherId: true },
    });
    if (!actor || !target) throw new ForbiddenException("User not found");

    if (actor.role === "ADMINISTRATOR" && target.role === "TEACHER") {
      if (!this.isWithinCeiling("TEACHER", permission)) {
        throw new ForbiddenException("Permission outside TEACHER capability ceiling");
      }
    } else if (actor.role === "TEACHER" && target.role === "STAFF") {
      if (target.managedByTeacherId !== actorId) {
        throw new ForbiddenException("Cannot manage Staff not owned by you");
      }
      if (!this.isWithinCeiling("STAFF", permission)) {
        throw new ForbiddenException("Permission outside STAFF capability ceiling");
      }
      const hasPerm = await this.hasPermission(actorId, permission);
      if (!hasPerm) {
        throw new ForbiddenException("Cannot delegate a permission you do not possess");
      }
    } else {
      throw new ForbiddenException("Delegation not allowed between these roles");
    }

    await this.prisma.userPermissionGrant.upsert({
      where: { userId_permission: { userId: targetUserId, permission } },
      create: { userId: targetUserId, permission, grantedByUserId: actorId },
      update: { grantedByUserId: actorId },
    });

    if (target.role === "TEACHER") {
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { permissionsInitialized: true },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "GRANT_PERMISSION",
        entity: "UserPermissionGrant",
        entityId: targetUserId,
        details: JSON.stringify({ permission, targetRole: target.role }),
      },
    });
  }

  async revokePermission(
    actorId: string,
    targetUserId: string,
    permission: Permission,
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, managedByTeacherId: true },
    });
    if (!actor || !target) throw new ForbiddenException("User not found");

    if (actor.role === "ADMINISTRATOR" && target.role === "TEACHER") {
      // allowed
    } else if (actor.role === "TEACHER" && target.role === "STAFF") {
      if (target.managedByTeacherId !== actorId) {
        throw new ForbiddenException("Cannot manage Staff not owned by you");
      }
    } else {
      throw new ForbiddenException("Revocation not allowed between these roles");
    }

    await this.prisma.userPermissionGrant.deleteMany({
      where: { userId: targetUserId, permission },
    });

    if (target.role === "TEACHER") {
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { permissionsInitialized: true },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "REVOKE_PERMISSION",
        entity: "UserPermissionGrant",
        entityId: targetUserId,
        details: JSON.stringify({ permission, targetRole: target.role }),
      },
    });
  }

  /**
   * Explicitly initialize a teacher's delegated permissions by persisting the
   * default Teacher capability ceiling as grants.
   *
   * Idempotent: if the teacher is already initialized, this is a no-op and
   * therefore never overwrites an administrator's explicit configuration.
   */
  async initializeTeacherPermissions(teacherId: string, actorId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true, permissionsInitialized: true },
    });
    if (user?.role !== "TEACHER") return;
    if (user.permissionsInitialized) return;

    const ceiling = CEILINGS.TEACHER;
    await this.prisma.$transaction(async (tx) => {
      await tx.userPermissionGrant.createMany({
        data: ceiling.map((permission) => ({
          userId: teacherId,
          permission,
          grantedByUserId: actorId,
        })),
        skipDuplicates: true,
      });
      await tx.user.update({
        where: { id: teacherId },
        data: { permissionsInitialized: true },
      });
    });
  }

  /**
   * One-time, idempotent backfill for legacy teachers that were created before
   * explicit permission initialization existed. Only seeds teachers that are
   * not yet initialized, so it never overwrites explicit administrator config.
   *
   * @returns the number of teachers initialized.
   */
  async backfillLegacyTeachers(actorId: string): Promise<number> {
    const teachers = await this.prisma.user.findMany({
      where: { role: "TEACHER", permissionsInitialized: false, deletedAt: null },
      select: { id: true },
    });

    for (const teacher of teachers) {
      await this.initializeTeacherPermissions(teacher.id, actorId);
    }

    return teachers.length;
  }
}
