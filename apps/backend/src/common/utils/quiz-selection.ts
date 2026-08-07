/**
 * Deterministic random question selection for quizzes.
 *
 * The teacher uploads a question bank of size N and optionally sets the number
 * of questions shown per attempt (M = questionCount). The bank is split into
 * distinct pools of size M:
 *
 *   - Attempt 1 → pool 1 (M random questions, no overlap with later pools)
 *   - Attempt 2 → pool 2
 *   - ...
 *   - Attempt k (k <= poolCount) → pool k
 *   - Attempt k (k > poolCount)  → M random questions mixed from the whole bank
 *
 * e.g. 40 questions with questionCount 20 → 2 pools:
 *   attempt 1 → pool A (20), attempt 2 → pool B (20, no repeat),
 *   attempt 3 → mix of all 40 (20 random).
 *
 * Selection is deterministic per (quizId, attemptNum) so the same attempt always
 * resolves to the same subset — getQuestions, startAttempt and submitQuiz agree.
 */

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function chunkBy<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Compute the ordered question IDs for a given attempt.
 *
 * @param allQuestionIds All question IDs in the bank (in displayOrder).
 * @param quizId Quiz ID (used as a stable seed per quiz).
 * @param attemptNum 1-based attempt number.
 * @param questionCount Questions per attempt; null/undefined/0 → use all.
 */
export function selectQuestionsForAttempt(
  allQuestionIds: readonly string[],
  quizId: string,
  attemptNum: number,
  questionCount?: number | null,
): string[] {
  const n = allQuestionIds.length;
  if (n === 0) return [];

  const m = Math.max(1, Math.min(questionCount ?? n, n));
  if (m >= n) return seededShuffle(allQuestionIds, hashSeed(`${quizId}:${String(attemptNum)}`));

  const poolCount = Math.ceil(n / m);
  const baseSeed = hashSeed(quizId);
  const shuffled = seededShuffle(allQuestionIds, baseSeed);

  // Distinct pools for the first `poolCount` attempts (no repetition).
  if (attemptNum <= poolCount) {
    const pools = chunkBy(shuffled, m);
    const pool = pools[attemptNum - 1];
    return seededShuffle(pool, hashSeed(`${quizId}:${String(attemptNum)}`));
  }

  // Beyond the distinct pools → mix M random questions from the whole bank.
  return seededShuffle(allQuestionIds, hashSeed(`${quizId}:${String(attemptNum)}`)).slice(0, m);
}
