export type PronunciationEngineName = "local-accurate" | "browser";

export interface PronunciationAssessInput {
  userId: string;
  expectedText: string;
  audioBuffer: Buffer;
  audioFormat: string;
  fileName: string;
  provider?: string;
  referencePhonemes?: string[];
  sampleRate?: number;
  language?: string;
}

export interface WordAssessment {
  word: string;
  score: number;
  accuracy: number;
  fluency: number;
  errorType: string;
  feedback: string;
  phonemes: { symbol: string; score: number; errorType: string }[];
}

export interface PronunciationAssessmentResult {
  overallScore: number;
  accuracy: number;
  fluency: number;
  prosody: number;
  completeness: number;
  transcript: string;
  engine: PronunciationEngineName;
  words: WordAssessment[];
  phonemes: { symbol: string; score: number; errorType: string }[];
}

export const PRONUNCIATION_PROVIDERS = ["local-accurate", "browser"] as const;
