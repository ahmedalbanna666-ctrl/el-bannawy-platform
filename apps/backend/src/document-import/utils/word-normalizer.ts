export interface ParsedWord {
  readonly word: string;
  readonly partOfSpeech: string | null;
}

const POS_PATTERN = /^(n|v|adj|adv|prep|pron|conj|det|phr v|phr|exp|idiom)$/i;

export function parseWord(raw: string): ParsedWord {
  const trimmed = raw.trim();
  const match = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(trimmed);

  if (match === null) {
    return { word: trimmed, partOfSpeech: null };
  }

  const wordPart = match[1].trim();
  const posCandidate = match[2].trim().toLowerCase();

  if (POS_PATTERN.test(posCandidate)) {
    return { word: wordPart, partOfSpeech: posCandidate };
  }

  return { word: trimmed, partOfSpeech: null };
}
