import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigurationService } from "../../config/configuration.service";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly config: ConfigurationService) {
    super();
  }

  handleRequest<TUser>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    if (err || !user) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown";
      this.logger.warn(`Google OAuth failed: ${message}`);
      const ctx = context.switchToHttp();
      const res = ctx.getResponse<{ redirect: (url: string) => void }>();
      const frontendUrl = this.config.app.frontendUrl;
      // Don't throw 500 – redirect to login with a safe error code
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      return null as unknown as TUser;
    }
    return user;
  }
}
