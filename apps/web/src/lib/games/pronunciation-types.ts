export type PronunciationEngineName = "gopt" | "forced-alignment" | "asr" | "local";

export type PhonemeErrorType = "none" | "substitution" | "deletion" | "insertion";
export type WordErrorType =
  | "none"
  | "mispronunciation"
  | "omission"
  | "insertion"
  | "repetition";

export interface PhonemeAssessment {
  symbol: string;
  score: number;
  errorType: PhonemeErrorType;
  start?: number;
  end?: number;
}

export interface WordAssessment {
  word: string;
  score: number;
  accuracy: number;
  fluency: number;
  start?: number;
  end?: number;
  errorType: WordErrorType;
  feedback?: string;
  phonemes: PhonemeAssessment[];
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
  phonemes: PhonemeAssessment[];
  raw?: Record<string, unknown>;
}

export interface PronunciationAssessResponse extends PronunciationAssessmentResult {
  id: string;
}

export interface AssessPronunciationOptions {
  provider?: PronunciationEngineName;
  referencePhonemes?: string[];
  sampleRate?: number;
  language?: string;
}
