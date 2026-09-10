import { Inject, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PRONUNCIATION_ENGINE_URL } from "../pronunciation.constants";
import type { PronunciationAssessmentResult } from "../pronunciation.types";

export interface EngineAssessRequest {
  audioBuffer: Buffer;
  audioFormat: string;
  fileName: string;
  expectedText: string;
  language?: string;
}

@Injectable()
export class PronunciationEngineClient {
  constructor(@Inject(PRONUNCIATION_ENGINE_URL) private readonly baseUrl: string) {}

  async assess(req: EngineAssessRequest): Promise<PronunciationAssessmentResult> {
    const form = new FormData();
    const blob = new Blob([req.audioBuffer as unknown as BlobPart], { type: req.audioFormat || "audio/wav" });
    form.append("audio", blob, req.fileName);
    form.append("expectedText", req.expectedText);
    if (req.language) form.append("language", req.language);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/internal/pronunciation/assess`, { method: "POST", body: form });
    } catch {
      throw new HttpException("تعذر الاتصال بخدمة التقييم", HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new HttpException(`فشل التقييم (${res.status}) ${detail}`, HttpStatus.BAD_GATEWAY);
    }
    return (await res.json()) as PronunciationAssessmentResult;
  }

  async health(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/internal/health`);
      return r.ok;
    } catch { return false; }
  }
}
