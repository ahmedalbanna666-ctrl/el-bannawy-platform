const POS_PATTERN =
  /^(n|v|vt|vi|adj|adv|prep|pron|conj|interj|det|art|aux|num|phr v|phr|exp|idiom)(\s*\/\s*(n|v|vt|vi|adj|adv|prep|pron|conj|interj|det|art|aux|num|phr v|phr|exp|idiom))*$/;

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
  const posCandidate = match[2].replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();

  if (POS_PATTERN.test(posCandidate)) {
    return { displayWord: wordPart, pronunciationText: wordPart, partOfSpeech: posCandidate };
  }

  return { displayWord: trimmed, pronunciationText: trimmed, partOfSpeech: null };
}
