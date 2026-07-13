import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@el-bannawy/shared";

export const PERMISSION_KEY = "required_permission";

export const RequirePermission = (permission: Permission): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSION_KEY, permission);
