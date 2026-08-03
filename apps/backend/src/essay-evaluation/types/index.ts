export interface GrammarError {
  type: "spelling" | "capitalization" | "punctuation" | "subject_verb_agreement" | "article" | "repetition" | "sentence_fragment";
  message: string;
  word: string;
  position: number;
  suggestion?: string;
}

export interface GrammarEvaluationResult {
  score: number;
  errors: GrammarError[];
  summary: string;
}

export interface AiCriterionScore {
  name: string;
  score: number;
  feedback: string;
}

export interface AiEvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  criterionScores: AiCriterionScore[];
}

export type CorrectionMode = "EXACT_MATCH" | "MANUAL" | "AI" | "GRAMMAR_CHECK";
