import type {
  PronunciationAssessmentResult,
  PronunciationAssessInput,
  PronunciationEngineName,
} from "../pronunciation.types";

export interface PronunciationProvider {
  readonly name: PronunciationEngineName;
  assess(input: PronunciationAssessInput): Promise<PronunciationAssessmentResult>;
}
