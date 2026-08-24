import { Injectable } from "@nestjs/common";
import type {
  PronunciationAssessmentResult,
  WordAssessment,
  PhonemeAssessment,
  WordErrorType,
  PhonemeErrorType,
} from "../pronunciation.types";

const PHONEME_ERRORS: readonly PhonemeErrorType[] = [
  "none",
  "substitution",
  "deletion",
  "insertion",
];
const WORD_ERRORS: readonly WordErrorType[] = [
  "none",
  "mispronunciation",
  "omission",
  "insertion",
  "repetition",
];
const ENGINES = ["gopt", "forced-alignment", "asr", "local"] as const;

function clampScore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function safePhonemeError(value: unknown): PhonemeErrorType {
  return PHONEME_ERRORS.includes(value as PhonemeErrorType)
    ? (value as PhonemeErrorType)
    : "none";
}

function safeWordError(value: unknown): WordErrorType {
  return WORD_ERRORS.includes(value as WordErrorType)
    ? (value as WordErrorType)
    : "none";
}

function safeEngine(value: unknown): PronunciationAssessmentResult["engine"] {
  return ENGINES.includes(value as (typeof ENGINES)[number])
    ? (value as (typeof ENGINES)[number])
    : "gopt";
}

function wordFeedback(score: number, errorType: WordErrorType): string {
  if (errorType === "omission") return "الكلمة غير مسموعة — حاول نطقها بوضوح";
  if (errorType === "insertion") return "تم نطق كلمة زائدة عن النص";
  if (score >= 85) return "نطق ممتاز";
  if (score >= 65) return "نطق جيد مع بعض الأخطاء";
  if (score >= 45) return "نطق مقبول — يحتاج تحسيناً";
  return "يلزم تحسين نطق هذه الكلمة";
}

function normalizePhoneme(input: unknown): PhonemeAssessment {
  const p = (input ?? {}) as Record<string, unknown>;
  return {
    symbol: typeof p.symbol === "string" ? p.symbol : "",
    score: clampScore(p.score),
    errorType: safePhonemeError(p.errorType),
    start: typeof p.start === "number" ? p.start : undefined,
    end: typeof p.end === "number" ? p.end : undefined,
  };
}

function normalizeWord(input: unknown): WordAssessment {
  const w = (input ?? {}) as Record<string, unknown>;
  const errorType = safeWordError(w.errorType);
  const score = clampScore(w.score);
  const phonemes = Array.isArray(w.phonemes)
    ? (w.phonemes as unknown[]).map(normalizePhoneme)
    : [];
  return {
    word: typeof w.word === "string" ? w.word : "",
    score,
    accuracy: clampScore(w.accuracy ?? score),
    fluency: clampScore(w.fluency ?? score),
    start: typeof w.start === "number" ? w.start : undefined,
    end: typeof w.end === "number" ? w.end : undefined,
    errorType,
    feedback: typeof w.feedback === "string" ? w.feedback : wordFeedback(score, errorType),
    phonemes,
  };
}

@Injectable()
export class ScoringAdapter {
  normalize(result: Partial<PronunciationAssessmentResult>): PronunciationAssessmentResult {
    const words = Array.isArray(result.words)
      ? (result.words as unknown[]).map(normalizeWord)
      : [];
    const phonemes = Array.isArray(result.phonemes)
      ? (result.phonemes as unknown[]).map(normalizePhoneme)
      : [];

    return {
      overallScore: clampScore(result.overallScore),
      accuracy: clampScore(result.accuracy),
      fluency: clampScore(result.fluency),
      prosody: clampScore(result.prosody),
      completeness: clampScore(result.completeness),
      transcript: typeof result.transcript === "string" ? result.transcript : "",
      engine: safeEngine(result.engine),
      words,
      phonemes,
      raw: result.raw,
    };
  }
}
