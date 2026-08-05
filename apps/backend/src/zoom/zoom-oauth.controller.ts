import { BadRequestException, Controller, Get, Query, Res } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { ZoomService } from "./zoom.service";

interface PendingOAuthState {
  readonly expiresAt: number;
}

/**
 * ZoomOAuthController — authorization-code OAuth flow.
 *
 * `GET /zoom/oauth/start`   redirects the browser to Zoom's authorize page.
 * `GET /zoom/oauth/callback` receives the authorization code, exchanges it for
 * access/refresh tokens, persists them, and returns the refresh token to the
 * operator so it can be kept out of the public log trail.
 *
 * The callback endpoint is intentionally unauthenticated (Zoom redirects the
 * browser here); CSRF is mitigated with a short-lived in-memory state token.
 */
@Controller("zoom/oauth")
export class ZoomOAuthController {
  private static readonly STATE_TTL_MS = 10 * 60 * 1000;
  private readonly pendingStates = new Map<string, PendingOAuthState>();

  constructor(private readonly zoom: ZoomService) {}

  @Get("start")
  start(@Res() res: Response): void {
    const state = randomUUID();
    this.pendingStates.set(state, { expiresAt: Date.now() + ZoomOAuthController.STATE_TTL_MS });
    res.redirect(this.zoom.getAuthorizationUrl(state));
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
  ): Promise<ISuccessResponse<unknown>> {
    const pending = state ? this.pendingStates.get(state) : undefined;
    if (!pending || pending.expiresAt < Date.now()) {
      throw new BadRequestException("Invalid or expired OAuth state");
    }
    this.pendingStates.delete(state);

    const tokens = await this.zoom.exchangeAuthorizationCode(code);
    return successResponse(
      {
        authorized: true,
        expiresInSeconds: Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000)),
      },
      "Zoom OAuth authorized",
    );
  }
}
