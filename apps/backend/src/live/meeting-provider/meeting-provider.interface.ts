export interface MeetingProviderPayload {
  readonly meetingNumber: string;
  readonly password: string | null;
  readonly joinUrl: string | null;
  readonly startUrl: string | null;
  readonly hostEmail: string | null;
  readonly topic: string;
  readonly status: string;
}

export interface CreateMeetingInput {
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

export type UpdateMeetingInput = Partial<CreateMeetingInput>;

export interface JoinConfigInput {
  readonly meetingNumber: string;
  readonly role: 0 | 1;
}

export interface JoinConfigResult {
  readonly signature: string;
  readonly sdkKey: string;
}

export type MeetingProviderId = "ZOOM_SDK" | "EXTERNAL_URL";

/** DI token for the MeetingProvider implementation (bound to ZoomProvider). */
export const MEETING_PROVIDER = Symbol("MEETING_PROVIDER");

/**
 * MeetingProvider — port for external meeting providers.
 *
 * The live module depends on this interface, never on a concrete vendor.
 * Each provider (e.g. Zoom) implements it as an adapter. This keeps the
 * domain logic decoupled from vendor APIs and allows future providers
 * to be added without touching services.
 */
export interface MeetingProvider {
  readonly id: MeetingProviderId;
  isConfigured(): boolean;
  isRestConfigured(): boolean;
  getSdkKey(): string;
  createMeeting(input: CreateMeetingInput): Promise<MeetingProviderPayload>;
  updateMeeting(meetingNumber: string, input: UpdateMeetingInput): Promise<void>;
  deleteMeeting(meetingNumber: string): Promise<void>;
  generateJoinConfig(input: JoinConfigInput): Promise<JoinConfigResult>;
}
