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
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role as UserRole | undefined;

  const role = userRole ?? "STUDENT";

  const authorizedPermissions: readonly Permission[] | undefined = user?.effectivePermissions;

  return {
    role,
    permissions: getPermissionsForRole(role),
    can: (permission: Permission): boolean => {
      if (authorizedPermissions !== undefined) {
        return authorizedPermissions.includes(permission);
      }
      return hasPermission(role, permission);
    },
    canAny: (...permissionList: Permission[]): boolean => {
      if (authorizedPermissions !== undefined) {
        return permissionList.some((p) => authorizedPermissions.includes(p));
      }
      return hasAnyPermission(role, permissionList);
    },
    canAll: (...permissionList: Permission[]): boolean => {
      if (authorizedPermissions !== undefined) {
        return permissionList.every((p) => authorizedPermissions.includes(p));
      }
      return hasAllPermissions(role, permissionList);
    },
    isAdmin: role === "ADMINISTRATOR",
    isTeacher: role === "TEACHER",
    isStaff: role === "STAFF",
    isStudent: role === "STUDENT",
  } as const;
}
