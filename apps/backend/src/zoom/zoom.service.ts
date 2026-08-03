import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { ConfigurationService } from "../config/configuration.service";

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
  readonly expires_in?: number;
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
 *  1. Mint an OAuth access token from ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET (client credentials grant).
 *  2. Create / update / delete Zoom meetings through the REST API.
 *  3. Generate in-browser Meeting SDK signatures (SDK Key + SDK Secret JWT, or OAuth signature endpoint).
 *
 * Secrets never leave the server; the frontend only receives a short-lived signature.
 */
@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);

  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigurationService) {}

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

  /**
   * OAuth client-credentials access token, cached until expiry.
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
    const body = new URLSearchParams({
      grant_type: "client_credentials",
    });
    body.set("client_id", cfg.clientId);
    body.set("client_secret", cfg.clientSecret);

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
    this.cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs };
    return data.access_token;
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
