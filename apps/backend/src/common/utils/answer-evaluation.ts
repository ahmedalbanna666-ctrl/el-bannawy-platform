export function isMultipleChoice(type: string): boolean {
  return type === "MULTIPLE_CHOICE";
}

export function parseOptionLabels(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed: unknown = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o: unknown) => {
      if (typeof o === "string") return "";
      if (typeof o === "object" && o !== null) {
        const label = (o as { label?: unknown }).label;
        return typeof label === "string" ? label.toLowerCase() : "";
      }
      return "";
    });
  } catch {
    return [];
  }
}

export function normalizeMcqCorrect(
  optionsJson: string | null,
  correctAnswer: string | null,
): string {
  const correct = (correctAnswer ?? "").trim().toLowerCase();
  if (/^[a-z]$/.test(correct)) {
    const labels = parseOptionLabels(optionsJson);
    const idx = labels.indexOf(correct);
    if (idx >= 0) return String(idx);
  }
  return correct;
}

export function isMcqAnswerCorrect(
  optionsJson: string | null,
  correctAnswer: string | null,
  studentAnswer: string,
): boolean {
  return studentAnswer === normalizeMcqCorrect(optionsJson, correctAnswer);
}

export function formatMcqStudentAnswer(
  optionsJson: string | null,
  studentAnswer: string | null,
): string | null {
  if (studentAnswer === null) return null;
  const labels = parseOptionLabels(optionsJson);
  const idx = Number.parseInt(studentAnswer, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= labels.length || !labels[idx]) {
    return studentAnswer;
  }
  return labels[idx].toUpperCase();
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Normalize text for comparison: lowercase, remove diacritics, collapse whitespace,
 * remove punctuation.
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u064B-\u065F]/g, "") // Arabic diacritics
    .replace(/[^\w\s\u0600-\u06FF]/g, "") // punctuation (keep Arabic + Latin + spaces)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if the student answer matches the correct answer with code-based fuzzy logic.
 *
 * Rules:
 * 1. Exact match after normalization → correct
 * 2. Edit distance ≤ 2 for short answers (≤ 5 words) → correct (minor typo)
 * 3. Missing/extra punctuation only → correct
 * 4. Missing/extra 1-2 characters (not changing word meaning) → correct
 * 5. Otherwise → incorrect
 */
export function isFuzzyMatch(studentAnswer: string, correctAnswer: string): boolean {
  const normalizedStudent = normalizeForComparison(studentAnswer);
  const normalizedCorrect = normalizeForComparison(correctAnswer);

  // 1. Exact match
  if (normalizedStudent === normalizedCorrect) return true;

  // 2. Check if acceptableAnswers array contains a match
  // (caller should handle this, but we provide the fuzzy check here)

  // 3. Edit distance check — lenient for short answers
  const maxDistance = normalizedCorrect.length <= 20 ? 2 : normalizedCorrect.length <= 50 ? 3 : 4;
  const distance = levenshtein(normalizedStudent, normalizedCorrect);
  if (distance <= maxDistance) return true;

  // 4. Word-level comparison: student answer contains all words from correct answer
  // (handles minor word order differences)
  const correctWords = normalizedCorrect.split(" ");
  const studentWords = normalizedStudent.split(" ");
  if (correctWords.length <= 3) {
    // For very short answers, all words must match
    const allMatch = correctWords.every((w) => studentWords.includes(w));
    if (allMatch && Math.abs(studentWords.length - correctWords.length) <= 1) return true;
  }

  // 5. Strip all non-alphanumeric and compare (punctuation-only errors)
  const strippedStudent = normalizedStudent.replace(/[\s\u0600-\u06FF]/g, "");
  const strippedCorrect = normalizedCorrect.replace(/[\s\u0600-\u06FF]/g, "");
  if (strippedStudent === strippedCorrect) return true;

  return false;
}

/**
 * Evaluate a short answer against correct answer + acceptableAnswers using code-based fuzzy logic.
 * Returns { isCorrect, matchType } where matchType indicates how the match was made.
 */
export function evaluateShortAnswer(
  studentAnswer: string,
  correctAnswer: string,
  acceptableAnswers?: string[],
): { isCorrect: boolean; matchType: "exact" | "fuzzy" | "acceptable" | "none" } {
  const normalizedStudent = normalizeForComparison(studentAnswer);
  const normalizedCorrect = normalizeForComparison(correctAnswer);

  // 1. Exact match
  if (normalizedStudent === normalizedCorrect) {
    return { isCorrect: true, matchType: "exact" };
  }

  // 2. Fuzzy match against correct answer
  if (isFuzzyMatch(studentAnswer, correctAnswer)) {
    return { isCorrect: true, matchType: "fuzzy" };
  }

  // 3. Check acceptable answers
  if (acceptableAnswers && acceptableAnswers.length > 0) {
    for (const alt of acceptableAnswers) {
      if (normalizeForComparison(alt) === normalizedStudent) {
        return { isCorrect: true, matchType: "acceptable" };
      }
      if (isFuzzyMatch(studentAnswer, alt)) {
        return { isCorrect: true, matchType: "fuzzy" };
      }
    }
  }

  return { isCorrect: false, matchType: "none" };
}
