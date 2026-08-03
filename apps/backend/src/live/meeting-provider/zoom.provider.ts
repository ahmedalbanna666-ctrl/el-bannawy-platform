import { Injectable } from "@nestjs/common";
import { ZoomService } from "../../zoom/zoom.service";
import type {
  MeetingProvider,
  MeetingProviderPayload,
  CreateMeetingInput,
  UpdateMeetingInput,
  JoinConfigInput,
  JoinConfigResult,
  MeetingProviderId,
} from "./meeting-provider.interface";

/**
 * ZoomProvider — adapts ZoomService to the MeetingProvider port.
 *
 * The live module uses ZoomProvider via MeetingProvider; the concrete
 * vendor implementation stays confined to this adapter.
 */
@Injectable()
export class ZoomProvider implements MeetingProvider {
  readonly id: MeetingProviderId = "ZOOM_SDK";

  constructor(private readonly zoom: ZoomService) {}

  isConfigured(): boolean {
    return this.zoom.isConfigured();
  }

  isRestConfigured(): boolean {
    return this.zoom.isRestConfigured();
  }

  getSdkKey(): string {
    return this.zoom.getSdkKey();
  }

  createMeeting(input: CreateMeetingInput): Promise<MeetingProviderPayload> {
    return this.zoom.createMeeting(input);
  }

  updateMeeting(meetingNumber: string, input: UpdateMeetingInput): Promise<void> {
    return this.zoom.updateMeeting(meetingNumber, input);
  }

  deleteMeeting(meetingNumber: string): Promise<void> {
    return this.zoom.deleteMeeting(meetingNumber);
  }

  generateJoinConfig(input: JoinConfigInput): Promise<JoinConfigResult> {
    return this.zoom.generateSdkSignature(input);
  }
}
