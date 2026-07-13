import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { DelegatedPermissionService } from "../../auth/delegated/delegated-permission.service";
import type { Permission } from "@el-bannawy/shared";
import type { Request } from "express";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly delegatedPermissionService: DelegatedPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermission === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { user?: { userId?: string } }
    >();

    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const hasPermission = await this.delegatedPermissionService.hasPermission(userId, requiredPermission);
    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }

    return true;
  }
}
