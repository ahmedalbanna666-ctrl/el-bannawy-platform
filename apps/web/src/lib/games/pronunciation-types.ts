export type EngineName = "local-accurate" | "browser";

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
  engine: EngineName;
  words: WordAssessment[];
  phonemes: { symbol: string; score: number; errorType: string }[];
}

export interface AssessPronunciationOptions {
  provider?: string;
  referencePhonemes?: string[];
  sampleRate?: number;
  language?: string;
}
