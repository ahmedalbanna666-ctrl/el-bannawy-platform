import { Inject, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PRONUNCIATION_ENGINE_URL } from "../pronunciation.constants";
import type { PronunciationAssessmentResult } from "../pronunciation.types";

export interface EngineAssessRequest {
  audioBuffer: Buffer;
  audioFormat: string;
  fileName: string;
  expectedText: string;
  provider?: string;
  referencePhonemes?: string[];
  sampleRate?: number;
  language?: string;
}

@Injectable()
export class PronunciationEngineClient {
  constructor(@Inject(PRONUNCIATION_ENGINE_URL) private readonly baseUrl: string) {}

  async assess(request: EngineAssessRequest): Promise<PronunciationAssessmentResult> {
    const form = new FormData();
    const blob = new Blob([request.audioBuffer as unknown as BlobPart], {
      type: request.audioFormat || "audio/wav",
    });
    form.append("audio", blob, request.fileName);
    form.append("expected_text", request.expectedText);
    if (request.provider) form.append("provider", request.provider);
    if (request.referencePhonemes) {
      form.append("reference_phonemes", JSON.stringify(request.referencePhonemes));
    }
    if (request.sampleRate) form.append("sample_rate", String(request.sampleRate));
    if (request.language) form.append("language", request.language);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/internal/pronunciation/assess`, {
        method: "POST",
        body: form,
      });
    } catch {
      throw new HttpException(
        "تعذر الاتصال بخدمة تقييم النطق",
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new HttpException(
        `فشل في خدمة تقييم النطق (${String(res.status)}) ${detail}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const json = (await res.json()) as PronunciationAssessmentResult;
    return json;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/health`, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }
}
