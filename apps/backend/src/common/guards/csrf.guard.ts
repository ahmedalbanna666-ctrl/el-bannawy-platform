import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return true;
    }

    const xRequestedWith = request.headers["x-requested-with"];
    const csrfHeader = request.headers["x-csrf-token"];

    if (xRequestedWith === "XMLHttpRequest" || Boolean(csrfHeader)) {
      return true;
    }

    throw new ForbiddenException("CSRF validation failed");
  }
}
