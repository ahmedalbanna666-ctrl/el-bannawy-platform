import type { GameWord, ListeningQuestion, PronunciationQuestion } from "./types";

export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function distinctTranslationCount(pool: readonly GameWord[]): number {
  return new Set(pool.map((word) => word.translation)).size;
}

export function buildListeningQuestions(
  pool: readonly GameWord[],
  count: number,
): ListeningQuestion[] {
  const words = shuffle(pool).slice(0, Math.min(count, pool.length));

  return words.map((entry) => {
    const distractors = shuffle(
      pool.filter((candidate) => candidate.translation !== entry.translation),
    )
      .slice(0, 3)
      .map((candidate) => candidate.translation);

    const options = shuffle([entry.translation, ...distractors]);

    return {
      word: entry.word,
      options,
      correctTranslation: entry.translation,
    };
  });
}

export function pickWordPairs(
  pool: readonly GameWord[],
  count: number,
): PronunciationQuestion[] {
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((entry) => ({ word: entry.word, translation: entry.translation }));
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  const curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j] ?? 0;
  }

  return prev[b.length] ?? 0;
}

function phonetic(input: string): string {
  return normalize(input)
    .replace(/[^a-z]/g, "")
    .replace(/sch/g, "sk")
    .replace(/ph/g, "f")
    .replace(/oo/g, "u")
    .replace(/c/g, "k")
    .replace(/[aeiou]/g, "")
    .replace(/(.)\1+/g, "$1");
}

export function pronunciationScore(target: string, spoken: string): number {
  const t = normalize(target);
  if (!t) return 0;

  const tokens = normalize(spoken).split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  // Exact word match (the spoken word shown on screen equals the target) → perfect.
  if (tokens.includes(t)) return 100;

  const pt = phonetic(target);

  let best = 0;
  for (const token of tokens) {
    const distance = levenshtein(t, token);
    // Allow a small number of character errors relative to the word length so a
    // correctly pronounced word is not penalised by minor speech-recognition noise.
    const allowed = Math.max(1, Math.floor(t.length / 3));
    let score: number;
    if (distance <= allowed) {
      score = Math.round(100 - (distance / t.length) * 25);
    } else {
      score = Math.round(
        (1 - distance / Math.max(t.length, token.length)) * 100,
      );
    }
    if (score > best) best = score;

    // Phonetic comparison: speech recognition often returns a phonetically similar
    // token (e.g. "skul" for "school", "appel" for "apple"). Matching on consonants
    // keeps a correctly pronounced word from being marked as weak.
    const ps = phonetic(token);
    if (pt && ps) {
      const pd = levenshtein(pt, ps);
      const pAllowed = Math.max(1, Math.floor(pt.length / 2));
      let pScore: number;
      if (pd <= pAllowed) {
        pScore = Math.round(100 - (pd / Math.max(pt.length, 1)) * 30);
      } else {
        pScore = Math.round(
          (1 - pd / Math.max(pt.length, ps.length)) * 100,
        );
      }
      if (pScore > best) best = pScore;
    }
  }

  return best;
}
