/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigurationService } from "../../config/configuration.service";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  private readonly logger = new Logger(GoogleAuthGuard.name);
  private readonly codeCache = new Map<string, { user: unknown; expiresAt: number }>();

  constructor(private readonly config: ConfigurationService) {
    super();
  }

  private getCachedUser(code: string): unknown | null {
    const entry = this.codeCache.get(code);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.codeCache.delete(code);
      return null;
    }
    return entry.user;
  }

  private setCachedUser(code: string, user: unknown): void {
    this.codeCache.set(code, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
    // Simple LRU: keep at most 100 entries
    if (this.codeCache.size > 100) {
      const firstKey = this.codeCache.keys().next().value as string | undefined;
      if (firstKey) this.codeCache.delete(firstKey);
    }
  }

  handleRequest<TUser>(err: unknown, user: TUser, info: unknown, context: ExecutionContext): TUser {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<{ url?: string; query?: Record<string, unknown>; headers?: Record<string, string> }>();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const cid = req.headers?.["x-correlation-id"] ?? "-";
    const code = req.query?.code as string | undefined;
    if (code) {
      const cached = this.getCachedUser(code);
      if (cached) {
        this.logger.log(`Google OAuth cache hit: cid=${cid} code=${code.slice(0, 8)}...`, "GoogleAuthGuard");
        return cached as TUser;
      }
    }
    if (user && code) this.setCachedUser(code, user);
    if (err || !user) {
      const infoMsg =
        info instanceof Error
          ? info.message
          : typeof info === "string"
            ? info
            : // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              info !== null &&
                typeof info === "object" &&
                "message" in (info as Record<string, unknown>)
              ? String((info as { message: unknown }).message)
              : "";
      const errMsg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
      const message = errMsg || infoMsg || "Unknown";
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      this.logger.warn(
        `Google OAuth failed: ${message} | cid=${cid} url=${req.url ?? ""} query=${JSON.stringify(req.query)} user=${JSON.stringify(user)} info=${JSON.stringify(info)} err=${String(err)}`,
      );
      const res = ctx.getResponse<{ redirect: (url: string) => void }>();
      const frontendUrl = this.config.app.frontendUrl;
      // Don't throw 500 – redirect to login with a safe error code
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      return null as unknown as TUser;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    this.logger.log(
      `Google OAuth success: cid=${req.headers?.["x-correlation-id"] ?? "-"} url=${req.url ?? ""} user=${JSON.stringify(user)}`,
      "GoogleAuthGuard",
    );
    return user;
  }
}
