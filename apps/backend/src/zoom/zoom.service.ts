import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { ConfigurationService } from "../config/configuration.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * ZoomMeetingPayload — normalized meeting data returned by the Zoom REST API.
 */
export interface ZoomMeetingPayload {
  readonly meetingNumber: string;
  readonly password: string | null;
  readonly joinUrl: string | null;
  readonly startUrl: string | null;
  readonly hostEmail: string | null;
  readonly topic: string;
  readonly status: string;
}

export interface CreateZoomMeetingInput {
  readonly topic?: string;
  readonly startTime?: string;
  readonly durationMinutes?: number;
  readonly timezone?: string;
  readonly password?: string;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly muteUponEntry?: boolean;
  readonly joinBeforeHost?: boolean;
  readonly hostVideo?: boolean;
  readonly participantVideo?: boolean;
}

export type UpdateZoomMeetingInput = Partial<CreateZoomMeetingInput>;

interface ZoomOAuthResponse {
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly expires_in?: number;
}

/** Persisted Zoom OAuth token set (stored encrypted-at-rest-free as config; never exposed). */
export interface ZoomOAuthTokenSet {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: number;
}

interface ZoomErrorPayload {
  readonly message?: string;
  readonly code?: number;
}

interface ZoomSignatureResponse {
  readonly signature?: string;
}

/**
 * ZoomService — server-side Zoom Meeting SDK integration.
 *
 * Responsibilities:
 *  1. Mint an OAuth access token. Two grants are supported:
 *     - Authorization-code flow (preferred): tokens are minted through
 *       `ZoomOAuthController` (`/zoom/oauth/*`), persisted in `SystemSetting`
 *       and refreshed transparently with the rotating refresh token.
 *     - Client-credentials grant (fallback): minted directly from
 *       ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET when no refresh token exists.
 *  2. Create / update / delete Zoom meetings through the REST API.
 *  3. Generate in-browser Meeting SDK signatures (SDK Key + SDK Secret JWT, or OAuth signature endpoint).
 *
 * Secrets never leave the server; the frontend only receives a short-lived signature.
 */
@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);
  private static readonly TOKEN_SETTING_KEY = "zoom_oauth_tokens";

  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: ConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    const cfg = this.config.zoom;
    return Boolean(cfg.clientId && cfg.clientSecret) || Boolean(cfg.sdkKey && cfg.sdkSecret);
  }

  isRestConfigured(): boolean {
    const cfg = this.config.zoom;
    return Boolean(cfg.clientId && cfg.clientSecret);
  }

  getSdkKey(): string {
    const cfg = this.config.zoom;
    return cfg.sdkKey || cfg.clientId || "";
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Zoom integration is not configured on the server. Please set ZOOM_SDK_KEY / ZOOM_SDK_SECRET (or ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET).",
      );
    }
  }

  // ── OAuth token storage (SystemSetting key/value store) ──────────────────

  private async loadStoredTokens(): Promise<ZoomOAuthTokenSet | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: ZoomService.TOKEN_SETTING_KEY },
    });
    if (!row) return null;
    try {
      return JSON.parse(row.value) as ZoomOAuthTokenSet;
    } catch {
      return null;
    }
  }

  private async persistTokens(tokens: ZoomOAuthTokenSet): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: ZoomService.TOKEN_SETTING_KEY },
      create: { key: ZoomService.TOKEN_SETTING_KEY, value: JSON.stringify(tokens) },
      update: { value: JSON.stringify(tokens) },
    });
  }

  /** Whether an authorization-code session has been completed (refresh token persisted). */
  async isOAuthAuthorized(): Promise<boolean> {
    const stored = await this.loadStoredTokens();
    return Boolean(stored?.refreshToken);
  }

  /**
   * OAuth access token, cached until expiry.
   *
   * Uses the persisted refresh token (authorization-code flow) when available,
   * otherwise falls back to the client-credentials grant. Zoom rotates refresh
   * tokens on every refresh, so the latest one is persisted back.
   */
  async getAccessToken(): Promise<string> {
    this.assertConfigured();
    if (!this.isRestConfigured()) {
      throw new ServiceUnavailableException(
        "Zoom REST API credentials (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET) are required for this operation.",
      );
    }

    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.token;
    }

    const cfg = this.config.zoom;
    const stored = await this.loadStoredTokens();
    const body = new URLSearchParams();
    body.set("client_id", cfg.clientId);
    body.set("client_secret", cfg.clientSecret);
    if (stored?.refreshToken) {
      body.set("grant_type", "refresh_token");
      body.set("refresh_token", stored.refreshToken);
    } else {
      body.set("grant_type", "client_credentials");
    }

    let response: Response;
    try {
      response = await fetch(cfg.oauthBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    } catch (err) {
      this.logger.error(`Zoom token request failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom authentication server");
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom token error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException("Zoom authentication failed");
    }

    const data = (await response.json()) as ZoomOAuthResponse;
    if (!data.access_token) {
      throw new BadGatewayException("Zoom authentication returned no access token");
    }

    const ttlMs = (data.expires_in ?? 3600) * 1000;
    const refreshToken = data.refresh_token ?? stored?.refreshToken ?? null;
    if (refreshToken) {
      await this.persistTokens({
        accessToken: data.access_token,
        refreshToken,
        expiresAt: Date.now() + ttlMs,
      });
    }
    this.cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs };
    return data.access_token;
  }

  /**
   * Build the Zoom authorization URL for the authorization-code flow.
   */
  getAuthorizationUrl(state: string): string {
    const cfg = this.config.zoom;
    if (!cfg.clientId) {
      throw new ServiceUnavailableException("Zoom OAuth client id is not configured");
    }
    const url = new URL(cfg.authorizeBaseUrl);
    url.searchParams.set("client_id", cfg.clientId);
    if (cfg.redirectUri) url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  /**
   * Exchange an authorization code for an access/refresh token pair and persist it.
   */
  async exchangeAuthorizationCode(code: string): Promise<ZoomOAuthTokenSet> {
    if (!this.isRestConfigured()) {
      throw new ServiceUnavailableException(
        "Zoom REST API credentials (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET) are required for this operation.",
      );
    }

    const cfg = this.config.zoom;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    });
    if (cfg.redirectUri) body.set("redirect_uri", cfg.redirectUri);

    let response: Response;
    try {
      response = await fetch(cfg.oauthBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    } catch (err) {
      this.logger.error(`Zoom OAuth code exchange failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom authentication server");
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom OAuth code error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException(errorBody.message ?? "Zoom OAuth authorization failed");
    }

    const data = (await response.json()) as ZoomOAuthResponse;
    if (!data.access_token) {
      throw new BadGatewayException("Zoom OAuth returned no access token");
    }

    const ttlMs = (data.expires_in ?? 3600) * 1000;
    const tokens: ZoomOAuthTokenSet = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: Date.now() + ttlMs,
    };
    await this.persistTokens(tokens);
    this.cachedToken = { token: tokens.accessToken, expiresAt: tokens.expiresAt };
    return tokens;
  }

  /**
   * Create a scheduled Zoom meeting and return normalized meeting data.
   */
  async createMeeting(input: CreateZoomMeetingInput): Promise<ZoomMeetingPayload> {
    const token = await this.getAccessToken();
    const cfg = this.config.zoom;

    const settings: Record<string, unknown> = {
      join_before_host: input.joinBeforeHost ?? true,
      waiting_room: input.waitingRoom ?? true,
      mute_upon_entry: input.muteUponEntry ?? true,
      host_video: input.hostVideo ?? true,
      participant_video: input.participantVideo ?? false,
    };
    if (input.autoRecord) {
      settings.auto_recording = "cloud";
    }

    const body: Record<string, unknown> = {
      topic: input.topic ?? "Live Session",
      type: 2,
      timezone: input.timezone ?? "Africa/Cairo",
      settings,
    };
    if (input.startTime) body.start_time = input.startTime;
    if (input.durationMinutes) body.duration = input.durationMinutes;
    if (input.password) body.password = input.password;

    let response: Response;
    try {
      response = await fetch(`${cfg.apiBaseUrl}/users/me/meetings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Zoom meeting create request failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom API");
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom create meeting error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException(errorBody.message ?? "Zoom failed to create the meeting");
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.normalizeMeeting(data);
  }

  /**
   * Update an existing Zoom meeting.
   */
  async updateMeeting(meetingNumber: string, input: UpdateZoomMeetingInput): Promise<void> {
    const token = await this.getAccessToken();
    const cfg = this.config.zoom;

    const body: Record<string, unknown> = {};
    if (input.topic) body.topic = input.topic;
    if (input.startTime) body.start_time = input.startTime;
    if (input.durationMinutes) body.duration = input.durationMinutes;
    if (input.timezone) body.timezone = input.timezone;
    if (input.password) body.password = input.password;

    if (
      input.waitingRoom !== undefined ||
      input.autoRecord !== undefined ||
      input.muteUponEntry !== undefined ||
      input.joinBeforeHost !== undefined ||
      input.hostVideo !== undefined ||
      input.participantVideo !== undefined
    ) {
      body.settings = {
        ...(input.waitingRoom !== undefined ? { waiting_room: input.waitingRoom } : {}),
        ...(input.muteUponEntry !== undefined ? { mute_upon_entry: input.muteUponEntry } : {}),
        ...(input.joinBeforeHost !== undefined ? { join_before_host: input.joinBeforeHost } : {}),
        ...(input.hostVideo !== undefined ? { host_video: input.hostVideo } : {}),
        ...(input.participantVideo !== undefined ? { participant_video: input.participantVideo } : {}),
        ...(input.autoRecord !== undefined ? { auto_recording: input.autoRecord ? "cloud" : "none" } : {}),
      };
    }

    let response: Response;
    try {
      response = await fetch(`${cfg.apiBaseUrl}/meetings/${encodeURIComponent(meetingNumber)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Zoom meeting update request failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom API");
    }

    if (!response.ok && response.status !== 204) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom update meeting error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException(errorBody.message ?? "Zoom failed to update the meeting");
    }
  }

  /**
   * Delete an existing Zoom meeting.
   */
  async deleteMeeting(meetingNumber: string): Promise<void> {
    const token = await this.getAccessToken();
    const cfg = this.config.zoom;

    let response: Response;
    try {
      response = await fetch(`${cfg.apiBaseUrl}/meetings/${encodeURIComponent(meetingNumber)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      this.logger.error(`Zoom meeting delete request failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom API");
    }

    if (!response.ok && response.status !== 204) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom delete meeting error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException(errorBody.message ?? "Zoom failed to delete the meeting");
    }
  }

  /**
   * Generate a short-lived signature that allows the Meeting SDK (browser) to join.
   *
   * Two strategies are supported:
   *  - JWT style: HMAC-SHA256 over the SDK key / secret pair (legacy Meeting SDK app).
   *  - OAuth style: ask Zoom's signature endpoint using a client-credentials token.
   */
  async generateSdkSignature(input: { meetingNumber: string; role: 0 | 1 }): Promise<{ signature: string; sdkKey: string }> {
    this.assertConfigured();
    const cfg = this.config.zoom;

    if (cfg.sdkKey && cfg.sdkSecret) {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + cfg.signatureTtlSeconds;
      const payload = {
        sdkKey: cfg.sdkKey,
        mn: input.meetingNumber,
        role: input.role,
        iat: now,
        exp,
        token: cfg.sdkKey,
      };
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = createHmac("sha256", cfg.sdkSecret)
        .update(`${header}.${body}`)
        .digest("base64url");
      return { signature: `${header}.${body}.${signature}`, sdkKey: cfg.sdkKey };
    }

    const token = await this.getAccessToken();
    const url = new URL(cfg.sdkSignatureUrl);
    url.searchParams.set("meetingNumber", input.meetingNumber);
    url.searchParams.set("role", String(input.role));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          clientId: cfg.clientId,
        },
      });
    } catch (err) {
      this.logger.error(`Zoom signature request failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException("Unable to reach Zoom signature server");
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ZoomErrorPayload;
      this.logger.error(`Zoom signature error ${String(response.status)}: ${errorBody.message ?? response.statusText}`);
      throw new BadGatewayException(errorBody.message ?? "Zoom failed to generate the meeting signature");
    }

    const data = (await response.json()) as ZoomSignatureResponse;
    if (!data.signature) {
      throw new BadGatewayException("Zoom returned no signature");
    }
    return { signature: data.signature, sdkKey: cfg.clientId };
  }

  private normalizeMeeting(data: Record<string, unknown>): ZoomMeetingPayload {
    const raw = data.id ?? data.meetingNumber ?? data.meeting_id;
    const numberValue = typeof raw === "number" || typeof raw === "string" ? raw : "";
    return {
      meetingNumber: String(numberValue),
      password: typeof data.password === "string" ? data.password : null,
      joinUrl: typeof data.join_url === "string" ? data.join_url : null,
      startUrl: typeof data.start_url === "string" ? data.start_url : null,
      hostEmail: typeof data.host_email === "string" ? data.host_email : null,
      topic: typeof data.topic === "string" ? data.topic : "Live Session",
      status: typeof data.status === "string" ? data.status : "created",
    };
  }
}
