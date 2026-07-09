import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS, type Permission } from "@el-bannawy/shared";
import type { UserRole } from "@el-bannawy/shared";

const CEILINGS: Record<UserRole, readonly Permission[]> = {
  ADMINISTRATOR: Object.values(PERMISSIONS),
  TEACHER: [
    PERMISSIONS.UNITS_VIEW, PERMISSIONS.UNITS_CREATE, PERMISSIONS.UNITS_EDIT,
    PERMISSIONS.LESSONS_VIEW, PERMISSIONS.LESSONS_CREATE, PERMISSIONS.LESSONS_EDIT,
    PERMISSIONS.VIDEOS_UPLOAD, PERMISSIONS.PDFS_UPLOAD,
    PERMISSIONS.VOCABULARY_MANAGE, PERMISSIONS.HOMEWORK_MANAGE, PERMISSIONS.QUIZZES_MANAGE,
    PERMISSIONS.FINAL_REVIEW_VIEW, PERMISSIONS.FINAL_REVIEW_EDIT,
    PERMISSIONS.STORY_VIEW, PERMISSIONS.STORY_EDIT, PERMISSIONS.STORY_PUBLISH,
    PERMISSIONS.LIVE_VIEW, PERMISSIONS.LIVE_CREATE, PERMISSIONS.LIVE_EDIT,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.AI_MANAGE,
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
    PERMISSIONS.AI_MANAGE,
  ],
};

@Injectable()
export class DelegatedPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  isWithinCeiling(role: UserRole, permission: Permission): boolean {
    return CEILINGS[role]?.includes(permission) ?? false;
  }

  async getEffectivePermissions(userId: string): Promise<readonly Permission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, managedByTeacherId: true, managedByTeacher: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (!user) return [];

    const ceiling = CEILINGS[user.role as UserRole] ?? [];

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
}
