import { SetMetadata } from "@nestjs/common";

export const IS_SKIP_AUTH_KEY = "isSkipAuth";

/**
 * Marks a route handler (or controller) as public — the JwtAuthGuard will
 * allow the request without a valid access token.
 */
export const SkipAuth = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_SKIP_AUTH_KEY, true);
