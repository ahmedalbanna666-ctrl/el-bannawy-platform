const POS_PATTERN = /^(n|v|adj|adv|prep|pron|conj|det|phr v|phr|exp|idiom)$/i;

export interface DisplayWord {
  readonly displayWord: string;
  readonly pronunciationText: string;
  readonly partOfSpeech: string | null;
}

export function parseDisplayWord(raw: string): DisplayWord {
  const trimmed = raw.trim();
  const match = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(trimmed);

  if (match === null) {
    return { displayWord: trimmed, pronunciationText: trimmed, partOfSpeech: null };
  }

  const wordPart = match[1].trim();
  const posCandidate = match[2].trim().toLowerCase();

  if (POS_PATTERN.test(posCandidate)) {
    return { displayWord: wordPart, pronunciationText: wordPart, partOfSpeech: posCandidate };
  }

  return { displayWord: trimmed, pronunciationText: trimmed, partOfSpeech: null };
}
