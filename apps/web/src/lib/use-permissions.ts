import { useAuthStore } from "@/lib/auth-store";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  type UserRole,
  type Permission,
} from "@el-bannawy/shared";

export function usePermissions(): {
  readonly role: UserRole;
  readonly permissions: readonly Permission[];
  readonly can: (permission: Permission) => boolean;
  readonly canAny: (...permissions: Permission[]) => boolean;
  readonly canAll: (...permissions: Permission[]) => boolean;
  readonly isAdmin: boolean;
  readonly isTeacher: boolean;
  readonly isStaff: boolean;
  readonly isStudent: boolean;
} {
  const userRole = useAuthStore((s) => s.user?.role) as UserRole | undefined;

  const role = userRole ?? "STUDENT";

  return {
    role,
    permissions: getPermissionsForRole(role),
    can: (permission: Permission): boolean => hasPermission(role, permission),
    canAny: (...permissions: Permission[]): boolean => hasAnyPermission(role, permissions),
    canAll: (...permissions: Permission[]): boolean => hasAllPermissions(role, permissions),
    isAdmin: role === "ADMINISTRATOR",
    isTeacher: role === "TEACHER",
    isStaff: role === "STAFF",
    isStudent: role === "STUDENT",
  } as const;
}
