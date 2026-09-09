export interface ParsedWord {
  readonly word: string;
  readonly partOfSpeech: string | null;
}

const POS_PATTERN =
  /^(n|v|vt|vi|adj|adv|prep|pron|conj|interj|det|art|aux|num|phr v|phr|exp|idiom)(\s*\/\s*(n|v|vt|vi|adj|adv|prep|pron|conj|interj|det|art|aux|num|phr v|phr|exp|idiom))*$/;

export function parseWord(raw: string): ParsedWord {
  const trimmed = raw.trim();
  const match = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(trimmed);

  if (match === null) {
    return { word: trimmed, partOfSpeech: null };
  }

  const wordPart = match[1].trim();
  const posCandidate = match[2].replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();

  if (POS_PATTERN.test(posCandidate)) {
    return { word: wordPart, partOfSpeech: posCandidate };
  }

  return { word: trimmed, partOfSpeech: null };
}
